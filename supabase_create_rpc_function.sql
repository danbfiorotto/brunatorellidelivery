-- Script para criar a função RPC get_appointment_totals no Supabase
-- Execute este script no SQL Editor do Supabase

-- ==================== RPC FUNCTION: get_appointment_totals ====================
-- This function calculates appointment totals server-side to avoid fetching
-- thousands of records to the client for calculation
-- Returns: total count, received amount, pending amount, and count by status

create or replace function get_appointment_totals(p_user_id uuid)
returns json
language plpgsql
security definer
as $$
declare
    result json;
    user_patient_ids uuid[];
begin
    -- Get all patient IDs belonging to this user
    select array_agg(id) into user_patient_ids
    from patients
    where user_id = p_user_id;
    
    -- If user has no patients, return zeros
    if user_patient_ids is null or array_length(user_patient_ids, 1) is null then
        return json_build_object(
            'total', 0,
            'received', 0,
            'pending', 0,
            'totalValue', 0,
            'byStatus', json_build_object(
                'scheduled', 0,
                'pending', 0,
                'paid', 0
            )
        );
    end if;
    
    -- Calculate all totals in a single query
    select json_build_object(
        'total', count(*)::int,
        'received', coalesce(sum(
            case 
                when status = 'paid' then
                    case 
                        when payment_type = 'percentage' and payment_percentage is not null 
                        then value * (payment_percentage / 100.0)
                        else value
                    end
                else 0
            end
        ), 0)::numeric,
        'pending', coalesce(sum(
            case 
                when status in ('pending', 'scheduled') then value
                else 0
            end
        ), 0)::numeric,
        'totalValue', coalesce(sum(
            case 
                when status = 'paid' then
                    case 
                        when payment_type = 'percentage' and payment_percentage is not null 
                        then value * (payment_percentage / 100.0)
                        else value
                    end
                when status in ('pending', 'scheduled') then value
                else 0
            end
        ), 0)::numeric,
        'byStatus', json_build_object(
            'scheduled', count(*) filter (where status = 'scheduled')::int,
            'pending', count(*) filter (where status = 'pending')::int,
            'paid', count(*) filter (where status = 'paid')::int
        )
    ) into result
    from appointments
    where patient_id = any(user_patient_ids);
    
    return result;
end;
$$;

-- Grant execute permission to authenticated users
grant execute on function get_appointment_totals(uuid) to authenticated;

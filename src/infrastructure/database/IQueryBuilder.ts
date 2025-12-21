/**
 * Interface para abstração de Query Builder
 * Permite trocar implementação de banco sem afetar código de negócio
 */
export interface IQueryBuilder {
    select(fields?: string | string[]): IQueryBuilder;
    where(column: string, operator: string, value: unknown): IQueryBuilder;
    order(column: string, options?: { ascending?: boolean }): IQueryBuilder;
    limit(count: number): IQueryBuilder;
    range(from: number, to: number): IQueryBuilder;
    single(): Promise<unknown>;
    maybeSingle(): Promise<unknown | null>;
    execute(): Promise<{ data: unknown[] | null; error: unknown }>;
}





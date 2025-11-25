import React, { useState } from 'react';
import { Send, Mic, Bot, User, Trash2 } from 'lucide-react';
import Card from '../components/UI/Card';
import Button from '../components/UI/Button';

const AiAssistant = () => {
    const [messages, setMessages] = useState([
        { id: 1, type: 'bot', text: 'Olá! Sou seu assistente virtual. Como posso ajudar com sua clínica hoje?' }
    ]);
    const [input, setInput] = useState('');

    const handleSend = (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        // Add user message
        const userMsg = { id: Date.now(), type: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        // Simulate bot response
        setTimeout(() => {
            const botMsg = {
                id: Date.now() + 1,
                type: 'bot',
                text: 'Esta é uma resposta simulada. A integração com IA estará disponível na versão 2.0.'
            };
            setMessages(prev => [...prev, botMsg]);
        }, 1000);
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col gap-4">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">Assistente IA</h2>
                <p className="text-gray-500">Seu copiloto inteligente</p>
            </div>

            <Card className="flex-1 flex flex-col overflow-hidden p-0">
                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex items-start gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
                        >
                            <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.type === 'user' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                                    }`}
                            >
                                {msg.type === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div
                                className={`max-w-[80%] p-3 rounded-lg text-sm ${msg.type === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-none'
                                        : 'bg-gray-100 text-gray-800 rounded-tl-none'
                                    }`}
                            >
                                {msg.text}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-100 bg-gray-50">
                    <div className="flex gap-2 mb-3 overflow-x-auto">
                        {['Ranking das clínicas', 'Faturamento do mês', 'Agendar paciente'].map((suggestion) => (
                            <button
                                key={suggestion}
                                onClick={() => setInput(suggestion)}
                                className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-600 hover:bg-gray-100 whitespace-nowrap"
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                    <form onSubmit={handleSend} className="flex gap-2">
                        <button
                            type="button"
                            className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-200 transition-colors"
                            onClick={() => setMessages([])}
                            title="Limpar chat"
                        >
                            <Trash2 size={20} />
                        </button>
                        <div className="flex-1 relative">
                            <input
                                type="text"
                                placeholder="Digite sua pergunta..."
                                className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-600"
                            >
                                <Mic size={18} />
                            </button>
                        </div>
                        <Button type="submit" className="px-4">
                            <Send size={18} />
                        </Button>
                    </form>
                </div>
            </Card>
        </div>
    );
};

export default AiAssistant;

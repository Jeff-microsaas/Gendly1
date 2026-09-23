import React, { useState } from 'react';
import { 
  X, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  ExternalLink, 
  MessageCircle, 
  Sparkles, 
  Calendar, 
  Clock, 
  Users, 
  ShieldCheck,
  QrCode
} from 'lucide-react';
import { Company } from '../types';

interface SmartSchedulingModalProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
  onOpenPublicBooking: () => void;
}

export const SmartSchedulingModal: React.FC<SmartSchedulingModalProps> = ({
  isOpen,
  onClose,
  company,
  onOpenPublicBooking
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const getBookingUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const cleanPath = window.location.pathname.replace(/\/+$/, '');
    return `${origin}${cleanPath}/?agendamento=${encodeURIComponent(company.id)}`;
  };

  const bookingUrl = getBookingUrl();

  const handleCopy = () => {
    if (typeof window !== 'undefined' && bookingUrl) {
      navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `Olá! Agora você pode agendar seu horário conosco online e em tempo real! Escolha o serviço, data e horário ideal para você:\n\n${bookingUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-purple-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-600 to-pink-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-all"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 bg-white/20 rounded-xl backdrop-blur-md">
              <Sparkles size={20} className="text-amber-300" />
            </span>
            <span className="text-xs font-black uppercase tracking-widest text-purple-200">
              Recurso Exclusivo Gendly
            </span>
          </div>

          <h2 className="text-2xl font-black tracking-tight">Agendamento Inteligente</h2>
          <p className="text-xs text-white/90 mt-1">
            Seus clientes agendam sozinhos sem login, com atualização de horários em tempo real.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Link Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                Seu Link Exclusivo de Agendamento
              </label>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenPublicBooking();
                }}
                className="text-xs font-bold text-purple-600 hover:text-purple-800 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <ExternalLink size={13} />
                <span>Abrir Agendamento</span>
              </button>
            </div>
            
            <div 
              onClick={() => {
                onClose();
                onOpenPublicBooking();
              }}
              title="Clique para abrir e testar a tela de agendamento"
              className="flex items-center gap-2 p-2.5 bg-purple-50 hover:bg-purple-100/80 border border-purple-200 rounded-2xl cursor-pointer transition-all group"
            >
              <div className="p-2 bg-white rounded-xl text-purple-600 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                <LinkIcon size={18} />
              </div>
              <input
                type="text"
                readOnly
                value={bookingUrl}
                className="w-full bg-transparent text-xs font-bold text-gray-800 outline-none truncate cursor-pointer select-all"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy();
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  copied
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                }`}
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-gray-400">
              💡 Clique no link acima para abrir a tela imediatamente ou copie para enviar aos seus clientes.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPublicBooking();
              }}
              className="py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs hover:scale-[1.02] active:scale-[0.98]"
            >
              <ExternalLink size={15} />
              <span>Acessar Agendamento</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs hover:scale-[1.02] active:scale-[0.98]"
            >
              <MessageCircle size={15} />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>

          {/* Highlights */}
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-3">
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-purple-600" />
              Como funciona o Agendamento Inteligente:
            </h3>

            <ul className="space-y-2.5 text-xs text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span><strong>Sem Login Necessário:</strong> Qualquer cliente acessa direto pelo link ou QR Code e faz o agendamento em segundos.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span><strong>Seleção Automática:</strong> Se houver apenas 1 profissional cadastrado, ele é selecionado automaticamente como padrão.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <span><strong>Tempo Real Sincronizado:</strong> Horários reservados são bloqueados instantaneamente para todos os usuários conectados.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">4</span>
                <span><strong>No seu Painel:</strong> Cada agendamento entra automaticamente em <em>Próximos Atendimentos</em> com status "Pendente" para você <strong>Confirmar</strong>, <strong>Lembrar</strong> ou <strong>Remarcar</strong>.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/70 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl text-xs font-bold transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

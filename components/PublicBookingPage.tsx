import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  CheckCircle2, 
  Sparkles, 
  Share2, 
  Phone, 
  Check, 
  ChevronRight, 
  ArrowLeft, 
  Building, 
  AlertCircle, 
  Tag, 
  MessageCircle, 
  CalendarCheck,
  BellRing
} from 'lucide-react';
import { db, onDatabaseChange, DB_TABLES } from '../services/db';
import { Company, Product, Professional, Appointment, Client, CompanySettings, Promotion } from '../types';
import { triggerSystemNotification } from '../services/notifications';

interface PublicBookingPageProps {
  companyId: string;
  onExitPreview?: () => void;
  onAppointmentCreated?: (appointment: Appointment) => void;
}

// Fallback services in case company has no services configured yet
const FALLBACK_SERVICES: Product[] = [
  {
    id: 'srv-fallback-1',
    companyId: 'default',
    name: 'Design de Sobrancelhas',
    type: 'SERVICE',
    category: 'Sobrancelha',
    price: 45.00,
    cost: 10.00,
    duration: 30,
    description: 'Design personalizado com alinhamento facial e acabamento de alta precisão.'
  },
  {
    id: 'srv-fallback-2',
    companyId: 'default',
    name: 'Limpeza de Pele Profunda',
    type: 'SERVICE',
    category: 'Facial',
    price: 120.00,
    cost: 35.00,
    duration: 60,
    description: 'Higienização profunda, esfoliação, extração de cravos e máscara calmante.'
  },
  {
    id: 'srv-fallback-3',
    companyId: 'default',
    name: 'Design de Sobrancelhas com Henna',
    type: 'SERVICE',
    category: 'Sobrancelha',
    price: 65.00,
    cost: 15.00,
    duration: 45,
    description: 'Preenchimento e definição com henna de alta durabilidade e fixação.'
  },
  {
    id: 'srv-fallback-4',
    companyId: 'default',
    name: 'Massagem Facial Relaxante',
    type: 'SERVICE',
    category: 'Facial',
    price: 80.00,
    cost: 20.00,
    duration: 40,
    description: 'Massagem com ativos hidratantes para aliviar tensão e revitalizar a pele.'
  }
];

const generateSlots = (start: string, end: string, intervalMinutes: number) => {
  const slots: string[] = [];
  try {
    const [startH, startM] = (start || '08:00').split(':').map(Number);
    const [endH, endM] = (end || '19:00').split(':').map(Number);
    const interval = intervalMinutes && intervalMinutes > 0 ? intervalMinutes : 30;

    let current = new Date();
    current.setHours(isNaN(startH) ? 8 : startH, isNaN(startM) ? 0 : startM, 0, 0);

    const finish = new Date();
    finish.setHours(isNaN(endH) ? 19 : endH, isNaN(endM) ? 0 : endM, 0, 0);

    while (current <= finish) {
      const h = String(current.getHours()).padStart(2, '0');
      const m = String(current.getMinutes()).padStart(2, '0');
      slots.push(`${h}:${m}`);
      current.setMinutes(current.getMinutes() + interval);
    }
  } catch (err) {
    console.error('Erro ao gerar horários:', err);
  }
  return slots.length > 0 ? slots : ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];
};

export const PublicBookingPage: React.FC<PublicBookingPageProps> = ({ 
  companyId, 
  onExitPreview,
  onAppointmentCreated 
}) => {
  // Resolve Target Company immediately without blocking spinner
  const initialCompany = useMemo(() => {
    try {
      const companies = db.companies.getAll();
      const cleanId = (companyId || '').trim();
      const match = companies.find(c => 
        c.id === cleanId || 
        c.id === decodeURIComponent(cleanId) ||
        c.name.toLowerCase().includes(cleanId.toLowerCase())
      );
      if (match) return match;
      return companies[0] || {
        id: cleanId || 'studio-alana-moreira',
        name: 'Studio Alana Moreira',
        subName: 'Estética & Beleza Especializada',
        plan: 'PREMIUM',
        neverExpires: true
      };
    } catch {
      return {
        id: companyId || 'studio-alana-moreira',
        name: 'Studio Alana Moreira',
        subName: 'Estética & Beleza Especializada',
        plan: 'PREMIUM',
        neverExpires: true
      };
    }
  }, [companyId]);

  const activeCompanyId = initialCompany.id;

  const [company, setCompany] = useState<Company>(initialCompany);
  const [settings, setSettings] = useState<CompanySettings | null>(() => {
    try {
      return db.settings.get(activeCompanyId);
    } catch {
      return null;
    }
  });

  const [services, setServices] = useState<Product[]>(() => {
    try {
      const allProds = db.products.getAll();
      const filtered = allProds.filter(p => (p.companyId === activeCompanyId || p.companyId === 'studio-alana-moreira') && p.type === 'SERVICE');
      return filtered.length > 0 ? filtered : FALLBACK_SERVICES;
    } catch {
      return FALLBACK_SERVICES;
    }
  });

  const [professionals, setProfessionals] = useState<Professional[]>(() => {
    try {
      const allProfs = db.professionals.getAll();
      const filtered = allProfs.filter(p => p.companyId === activeCompanyId || p.companyId === 'studio-alana-moreira');
      return filtered.length > 0 ? filtered : allProfs;
    } catch {
      return [];
    }
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    try {
      return db.appointments.getAll().filter(a => a.companyId === activeCompanyId);
    } catch {
      return [];
    }
  });

  const [promotions, setPromotions] = useState<Promotion[]>(() => {
    try {
      return db.promotions.getAll().filter(p => p.companyId === activeCompanyId && p.active);
    } catch {
      return [];
    }
  });

  // Selected state
  const [selectedServiceId, setSelectedServiceId] = useState<string>(() => {
    return services.length > 0 ? services[0].id : '';
  });

  const [selectedProfessional, setSelectedProfessional] = useState<string>(() => {
    if (professionals.length === 1) {
      return professionals[0].nickname || professionals[0].name;
    }
    return '';
  });

  // Calendar dates (Next 14 days)
  const availableDates = useMemo(() => {
    const list = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const iso = d.toLocaleDateString('en-CA'); // YYYY-MM-DD
      const weekday = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();
      const dayNum = String(d.getDate()).padStart(2, '0');
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      list.push({
        iso,
        weekday,
        dayNum,
        monthName,
        isToday: i === 0
      });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return availableDates.length > 0 ? availableDates[0].iso : new Date().toLocaleDateString('en-CA');
  });

  const [selectedTime, setSelectedTime] = useState<string>('');

  // Client info form
  const [clientName, setClientName] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [clientNickname, setClientNickname] = useState('');
  const [clientNotes, setClientNotes] = useState('');

  // Flow & UI State
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);
  const [liveSyncPulse, setLiveSyncPulse] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync data in real-time
  const refreshAppointments = useCallback(() => {
    try {
      const freshApts = db.appointments.getAll().filter(a => a.companyId === activeCompanyId);
      setAppointments(freshApts);
    } catch {
      // ignore
    }
  }, [activeCompanyId]);

  useEffect(() => {
    const unsubscribe = onDatabaseChange((key) => {
      if (
        key === DB_TABLES.APPOINTMENTS || 
        key === 'gendly_appointments' ||
        key === DB_TABLES.PRODUCTS ||
        key === DB_TABLES.SETTINGS ||
        key === DB_TABLES.PROFESSIONALS
      ) {
        setLiveSyncPulse(true);
        setTimeout(() => setLiveSyncPulse(false), 800);
        refreshAppointments();
      }
    });

    // Polling every 2.5s guarantees instant updates across multiple tabs/browsers
    const interval = setInterval(refreshAppointments, 2500);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [refreshAppointments]);

  // If professionals length updates and only 1 exists, auto-select
  useEffect(() => {
    if (professionals.length === 1 && !selectedProfessional) {
      setSelectedProfessional(professionals[0].nickname || professionals[0].name);
    }
  }, [professionals, selectedProfessional]);

  // Selected Service Details
  const currentService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId) || services[0] || null;
  }, [services, selectedServiceId]);

  // Active Promo for Selected Service
  const servicePromo = useMemo(() => {
    if (!currentService) return null;
    return promotions.find(p => p.serviceId === currentService.id && p.active) || null;
  }, [currentService, promotions]);

  const effectivePrice = useMemo(() => {
    if (!currentService) return 0;
    if (servicePromo) return servicePromo.promotionalPrice;
    return currentService.price;
  }, [currentService, servicePromo]);

  // Time Slots & Real-Time Busy Check
  const allSlots = useMemo(() => {
    const opening = settings?.openingTime || '08:00';
    const closing = settings?.closingTime || '19:00';
    const interval = settings?.interval || 30;
    return generateSlots(opening, closing, interval);
  }, [settings]);

  const busyTimes = useMemo(() => {
    if (!selectedDate) return new Set<string>();
    const busy = new Set<string>();
    appointments.forEach(apt => {
      if (apt.rawDate === selectedDate && apt.status !== 'Cancelado') {
        if (!selectedProfessional || apt.professional === selectedProfessional) {
          busy.add(apt.time);
        }
      }
    });
    return busy;
  }, [selectedDate, appointments, selectedProfessional]);

  // Phone mask formatting
  const handleWhatsappChange = (val: string) => {
    const raw = val.replace(/\D/g, '').slice(0, 11);
    let formatted = raw;
    if (raw.length > 2) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2)}`;
    }
    if (raw.length > 7) {
      formatted = `(${raw.slice(0, 2)}) ${raw.slice(2, 7)}-${raw.slice(7)}`;
    }
    setClientWhatsapp(formatted);
  };

  // Submit and reserve appointment
  const handleConfirmBooking = () => {
    if (!currentService) {
      alert('Por favor, selecione um serviço.');
      setStep(1);
      return;
    }
    if (!selectedDate || !selectedTime) {
      alert('Por favor, selecione a data e o horário desejado.');
      setStep(3);
      return;
    }
    if (!clientName.trim() || !clientWhatsapp.trim()) {
      alert('Por favor, preencha seu Nome Completo e WhatsApp para confirmarmos o agendamento.');
      setStep(4);
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Double check real-time availability just before booking
      const freshApts = db.appointments.getAll().filter(a => a.companyId === activeCompanyId);
      const isTaken = freshApts.some(a => 
        a.rawDate === selectedDate && 
        a.time === selectedTime && 
        a.status !== 'Cancelado' &&
        (!selectedProfessional || a.professional === selectedProfessional)
      );

      if (isTaken) {
        alert('Atenção: Este horário acabou de ser reservado por outro cliente! Por favor, escolha outro horário livre.');
        setStep(3);
        setIsSubmitting(false);
        return;
      }

      // 2. Format Date
      const [year, month, day] = selectedDate.split('-');
      const formattedDateBR = `${day}/${month}/${year}`;
      const [y, m, d] = [parseInt(year), parseInt(month) - 1, parseInt(day)];
      const targetDateObj = new Date(y, m, d);
      const weekdayShort = targetDateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();

      // 3. Resolve Professional
      let finalProfName = selectedProfessional;
      let profAvatar = 'https://ui-avatars.com/api/?name=Profissional&background=e9d5ff&color=7e22ce';

      if (!finalProfName && professionals.length > 0) {
        finalProfName = professionals[0].nickname || professionals[0].name;
        profAvatar = professionals[0].avatar || profAvatar;
      } else if (finalProfName) {
        const pObj = professionals.find(p => (p.nickname || p.name) === finalProfName);
        if (pObj) {
          profAvatar = pObj.avatar || profAvatar;
        }
      } else {
        finalProfName = 'Equipe Studio';
      }

      // 4. Save/Update Client in database
      const cleanWhatsapp = clientWhatsapp.replace(/\D/g, '');
      const clientRecord: Client = {
        id: `cli-${Date.now()}`,
        companyId: activeCompanyId,
        name: clientName.trim(),
        nickname: clientNickname.trim() || clientName.trim().split(' ')[0],
        whatsapp: clientWhatsapp.trim(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName.trim())}&background=f3e8ff&color=9333ea`
      };
      db.clients.upsert(clientRecord);

      // 5. Create Appointment with status 'Pendente' (Appears in "Próximos Atendimentos")
      const newAppointment: Appointment = {
        id: Date.now(),
        companyId: activeCompanyId,
        time: selectedTime,
        date: formattedDateBR,
        rawDate: selectedDate,
        weekday: weekdayShort,
        client: clientRecord.name,
        clientId: clientRecord.id,
        avatar: clientRecord.avatar,
        phone: clientRecord.whatsapp,
        service: currentService.name,
        professional: finalProfName,
        professionalAvatar: profAvatar,
        status: 'Pendente', // Goes straight to "Próximos Atendimentos" to be confirmed/reminded/rescheduled/deleted
        price: effectivePrice,
        cost: currentService.cost || 0,
        category: currentService.category || 'Geral',
        notes: clientNotes ? `[Agendado Online]: ${clientNotes}` : '[Agendado pelo Link Exclusivo Online]'
      };

      // Save to database
      db.appointments.create(newAppointment);

      // Update local state
      setAppointments(prev => [newAppointment, ...prev]);
      setConfirmedAppointment(newAppointment);

      // Notify parent if callback provided
      if (onAppointmentCreated) {
        onAppointmentCreated(newAppointment);
      }

      // Trigger system notification for business owner
      triggerSystemNotification('🎉 Novo Agendamento Online!', {
        body: `${clientRecord.name} agendou ${currentService.name} para ${formattedDateBR} às ${selectedTime}!`,
        tag: `new_apt_${newAppointment.id}`
      });

      // Advance to success step
      setStep(5);
    } catch (err) {
      console.error('Erro ao salvar agendamento:', err);
      alert('Houve um erro ao processar seu agendamento. Por favor, tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const openWhatsAppConfirmation = () => {
    if (!confirmedAppointment) return;
    const companyDisplayName = settings?.companyName || company.name || 'Studio';
    const msg = `Olá! Acabei de realizar meu agendamento online no ${companyDisplayName}:\n\n` +
      `📅 Data: ${confirmedAppointment.date} (${confirmedAppointment.weekday})\n` +
      `⏰ Horário: ${confirmedAppointment.time}\n` +
      `✂️ Serviço: ${confirmedAppointment.service}\n` +
      `👤 Profissional: ${confirmedAppointment.professional}\n` +
      `💰 Valor: R$ ${confirmedAppointment.price.toFixed(2)}\n\n` +
      `Nome: ${confirmedAppointment.client}\n` +
      `Aguardo a confirmação!`;

    const phone = (company.whatsapp || settings?.phone || '').replace(/\D/g, '');
    const url = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const companyName = settings?.companyName || company.name || 'Studio & Beleza';
  const companySubName = settings?.companySubName || company.subName || 'Agendamento Online Inteligente';
  const companyLogo = settings?.logo || company.logo;

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col selection:bg-purple-100 selection:text-purple-900">
      {/* Top Notification Bar for Real-time Connection */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white py-2.5 px-4 shadow-sm text-xs font-semibold">
        <div className="flex items-center gap-2 max-w-3xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${liveSyncPulse ? 'bg-amber-300 scale-125' : 'bg-emerald-400 animate-pulse'} transition-all duration-300`}></span>
            <span className="font-bold">Agendamento Inteligente em Tempo Real</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCopyLink}
              className="hover:underline flex items-center gap-1 text-[11px] opacity-95 hover:opacity-100 font-bold bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
              title="Copiar link desta página de agendamento"
            >
              <Share2 size={12} />
              {copiedLink ? 'Link Copiado!' : 'Copiar Link'}
            </button>
            {onExitPreview && (
              <button
                type="button"
                onClick={onExitPreview}
                className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-[11px] font-bold transition-all shadow-2xs"
              >
                Voltar ao Sistema
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Header with Business Brand */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 p-0.5 shadow-sm shrink-0 overflow-hidden flex items-center justify-center text-white">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="w-full h-full rounded-2xl object-cover" />
              ) : (
                <Building size={24} />
              )}
            </div>
            <div>
              <h1 className="text-lg font-black text-gray-900 leading-tight flex items-center gap-1.5">
                {companyName}
                <Sparkles size={16} className="text-amber-500 fill-amber-500 shrink-0" />
              </h1>
              <p className="text-xs font-semibold text-purple-600">{companySubName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Horários sincronizados
          </div>
        </div>

        {/* Step Indicator (Steps 1 to 4) */}
        {step < 5 && (
          <div className="max-w-3xl mx-auto px-4 py-2.5 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500">
            <button 
              type="button"
              onClick={() => setStep(1)} 
              className={`flex items-center gap-1.5 py-1 ${step === 1 ? 'text-purple-700 font-black' : step > 1 ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-purple-600 text-white' : step > 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>1</span>
              <span>Serviço</span>
            </button>
            <ChevronRight size={14} className="text-gray-300" />

            <button 
              type="button"
              onClick={() => currentService && setStep(2)} 
              disabled={!currentService} 
              className={`flex items-center gap-1.5 py-1 ${step === 2 ? 'text-purple-700 font-black' : step > 2 ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-purple-600 text-white' : step > 2 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>2</span>
              <span>Profissional</span>
            </button>
            <ChevronRight size={14} className="text-gray-300" />

            <button 
              type="button"
              onClick={() => currentService && setStep(3)} 
              disabled={!currentService} 
              className={`flex items-center gap-1.5 py-1 ${step === 3 ? 'text-purple-700 font-black' : step > 3 ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-purple-600 text-white' : step > 3 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>3</span>
              <span>Data & Hora</span>
            </button>
            <ChevronRight size={14} className="text-gray-300" />

            <button 
              type="button"
              onClick={() => currentService && selectedDate && selectedTime && setStep(4)} 
              disabled={!currentService || !selectedDate || !selectedTime} 
              className={`flex items-center gap-1.5 py-1 ${step === 4 ? 'text-purple-700 font-black' : 'text-gray-400'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 4 ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}>4</span>
              <span>Confirmar</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 pb-24">
        {/* STEP 1: CHOOSE SERVICE */}
        {step === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Escolha o Serviço</h2>
              <p className="text-sm text-gray-500">Selecione o procedimento que deseja realizar.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {services.map(srv => {
                const isSelected = selectedServiceId === srv.id;
                const promo = promotions.find(p => p.serviceId === srv.id && p.active);
                const displayPrice = promo ? promo.promotionalPrice : srv.price;

                return (
                  <div
                    key={srv.id}
                    onClick={() => {
                      setSelectedServiceId(srv.id);
                      setTimeout(() => setStep(2), 150);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected 
                        ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-400 shadow-md' 
                        : 'bg-white border-gray-200 hover:border-purple-300 hover:shadow-sm'
                    }`}
                  >
                    {promo && (
                      <div className="absolute -top-2.5 right-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-xs flex items-center gap-1">
                        <Tag size={10} /> Promoção
                      </div>
                    )}

                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <h3 className="font-bold text-gray-900 text-base leading-snug">{srv.name}</h3>
                        <div className="text-right shrink-0">
                          {promo ? (
                            <div>
                              <span className="text-xs text-gray-400 line-through mr-1">R$ {srv.price.toFixed(2)}</span>
                              <span className="text-base font-black text-purple-700">R$ {displayPrice.toFixed(2)}</span>
                            </div>
                          ) : (
                            <span className="text-base font-black text-gray-900">R$ {srv.price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>

                      {srv.description && (
                        <p className="text-xs text-gray-500 line-clamp-2 mb-3">{srv.description}</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-100 text-xs text-gray-500 font-semibold">
                      <div className="flex items-center gap-1">
                        <Clock size={13} className="text-purple-500" />
                        <span>{srv.duration || 30} min</span>
                      </div>
                      <span className={`font-bold flex items-center gap-1 ${isSelected ? 'text-purple-700' : 'text-gray-400'}`}>
                        {isSelected ? 'Selecionado' : 'Escolher'} <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {services.length === 0 && (
              <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-500">
                <Scissors size={40} className="mx-auto mb-2 text-gray-300" />
                <p className="font-bold">Nenhum serviço disponível no momento.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CHOOSE PROFESSIONAL */}
        {step === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Escolha o Profissional</h2>
                <p className="text-sm text-gray-500">
                  {professionals.length === 1 
                    ? 'Profissional especialista já selecionado para seu atendimento.' 
                    : 'Selecione quem você prefere ou escolha "Qualquer Profissional".'}
                </p>
              </div>
              <button 
                type="button"
                onClick={() => setStep(1)} 
                className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Trocar serviço
              </button>
            </div>

            {/* Selected Service Badge */}
            {currentService && (
              <div className="p-3.5 bg-purple-50/80 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Scissors size={15} className="text-purple-600" />
                  <span className="font-bold text-gray-900">{currentService.name}</span>
                </div>
                <span className="font-black text-purple-700">R$ {effectivePrice.toFixed(2)}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Option: Any Professional */}
              {professionals.length > 1 && (
                <div
                  onClick={() => {
                    setSelectedProfessional('');
                    setTimeout(() => setStep(3), 150);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                    selectedProfessional === '' 
                      ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-400 shadow-md' 
                      : 'bg-white border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 text-white flex items-center justify-center font-black text-sm shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-sm leading-tight">Qualquer Profissional</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Primeiro horário livre disponível</p>
                  </div>
                  {selectedProfessional === '' && <Check size={18} className="text-purple-600" />}
                </div>
              )}

              {/* Real Registered Professionals */}
              {professionals.map(prof => {
                const profName = prof.nickname || prof.name;
                const isSelected = selectedProfessional === profName;
                return (
                  <div
                    key={prof.id}
                    onClick={() => {
                      setSelectedProfessional(profName);
                      setTimeout(() => setStep(3), 150);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 ${
                      isSelected 
                        ? 'bg-purple-50/90 border-purple-500 ring-2 ring-purple-400 shadow-md' 
                        : 'bg-white border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <img
                      src={prof.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profName)}&background=f3e8ff&color=9333ea`}
                      alt={profName}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{profName}</h3>
                        {professionals.length === 1 && (
                          <span className="text-[9px] bg-purple-100 text-purple-700 px-1.5 py-0.2 rounded font-bold">Padrão</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">{prof.specialty || 'Especialista'}</p>
                    </div>
                    {isSelected && <Check size={18} className="text-purple-600" />}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-100 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors shadow-sm"
              >
                Continuar para Data e Hora
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CHOOSE DATE & TIME */}
        {step === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Escolha a Data e Horário</h2>
                <p className="text-sm text-gray-500">Horários disponíveis atualizados em tempo real.</p>
              </div>
              <button 
                type="button"
                onClick={() => setStep(2)} 
                className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Alterar profissional
              </button>
            </div>

            {/* Horizontal Date Picker */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2.5">
                Selecione o Dia
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {availableDates.map(item => {
                  const isSelected = selectedDate === item.iso;
                  return (
                    <button
                      key={item.iso}
                      type="button"
                      onClick={() => {
                        setSelectedDate(item.iso);
                        setSelectedTime(''); // Reset time when date changes
                      }}
                      className={`flex flex-col items-center justify-center p-3 min-w-[4.8rem] rounded-2xl border transition-all text-center shrink-0 ${
                        isSelected
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200 scale-105'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-purple-300 hover:bg-purple-50/50'
                      }`}
                    >
                      <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-purple-200' : 'text-gray-400'}`}>
                        {item.isToday ? 'Hoje' : item.weekday}
                      </span>
                      <span className="text-lg font-black leading-tight my-0.5">{item.dayNum}</span>
                      <span className={`text-[10px] font-medium ${isSelected ? 'text-purple-100' : 'text-gray-500'}`}>
                        {item.monthName}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slots Grid */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Horários Disponíveis ({selectedDate})
                </label>
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Tempo Real Ativo
                </div>
              </div>

              {allSlots.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {allSlots.map(timeStr => {
                    const isOccupied = busyTimes.has(timeStr);
                    const isSelected = selectedTime === timeStr;

                    if (isOccupied) {
                      return (
                        <div
                          key={timeStr}
                          className="p-3 rounded-xl border border-gray-100 bg-gray-100/70 text-gray-400 text-center text-xs font-bold cursor-not-allowed select-none line-through"
                          title="Horário já reservado por outro cliente"
                        >
                          {timeStr}
                        </div>
                      );
                    }

                    return (
                      <button
                        key={timeStr}
                        type="button"
                        onClick={() => {
                          setSelectedTime(timeStr);
                          setTimeout(() => setStep(4), 150);
                        }}
                        className={`p-3 rounded-xl border text-center text-xs font-black transition-all ${
                          isSelected
                            ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-200 scale-105'
                            : 'bg-white text-gray-800 border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                        }`}
                      >
                        {timeStr}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-white rounded-2xl border border-gray-200 text-center text-gray-500 text-xs">
                  Nenhum horário cadastrado para este dia.
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-100 transition-colors"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={() => setStep(4)}
                disabled={!selectedTime}
                className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar para Confirmação
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CLIENT DATA & FINAL CONFIRMATION BUTTON */}
        {step === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Seus Dados de Contato</h2>
              <p className="text-sm text-gray-500">Informe seus dados para finalizar e receber a confirmação.</p>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 sm:p-5 rounded-2xl border border-purple-100 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarCheck size={15} className="text-purple-600" />
                Resumo da Sua Escolha
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 block font-semibold">Serviço:</span>
                  <span className="font-bold text-gray-900">{currentService?.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">Valor:</span>
                  <span className="font-black text-purple-700">R$ {effectivePrice.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">Profissional:</span>
                  <span className="font-bold text-gray-900">{selectedProfessional || 'Primeiro disponível'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold">Data & Horário:</span>
                  <span className="font-bold text-gray-900">{selectedDate} às {selectedTime}</span>
                </div>
              </div>
            </div>

            {/* Input Form */}
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Nome Completo <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm font-semibold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  WhatsApp / Celular <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={clientWhatsapp}
                    onChange={(e) => handleWhatsappChange(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm font-semibold text-gray-800"
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-1">Seu WhatsApp para confirmação do atendimento.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Como prefere ser chamada(o)? (Apelido - Opcional)
                </label>
                <input
                  type="text"
                  value={clientNickname}
                  onChange={(e) => setClientNickname(e.target.value)}
                  placeholder="Ex: Mari"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm font-semibold text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Observações ou Pedido Especial (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={clientNotes}
                  onChange={(e) => setClientNotes(e.target.value)}
                  placeholder="Alguma observação, preferência ou alergia..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm font-medium text-gray-800 resize-none"
                />
              </div>
            </div>

            {/* MANDATORY ACTION BUTTON */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={isSubmitting || !clientName.trim() || !clientWhatsapp.trim()}
                className="w-full py-4 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 text-white rounded-2xl font-black text-base shadow-lg shadow-purple-300 hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Reservando Horário em Tempo Real...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={20} />
                    <span>CONFIRMAR MEU AGENDAMENTO</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors text-center"
              >
                Voltar e alterar data ou horário
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS CONFIRMATION SCREEN */}
        {step === 5 && confirmedAppointment && (
          <div className="space-y-6 animate-in zoom-in-95 duration-200 text-center max-w-lg mx-auto py-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50">
              <CheckCircle2 size={42} />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Agendamento Confirmado!</h2>
              <p className="text-sm text-gray-600">
                Seu horário foi reservado com sucesso no sistema e já consta no quadro de Próximos Atendimentos.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm text-left space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600">Status do Agendamento</span>
                <span className="px-3 py-1 bg-amber-50 text-amber-700 font-black text-xs rounded-full uppercase border border-amber-200">
                  {confirmedAppointment.status}
                </span>
              </div>

              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Cliente:</span>
                  <span className="font-bold text-gray-900">{confirmedAppointment.client}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Serviço:</span>
                  <span className="font-bold text-gray-900">{confirmedAppointment.service}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Profissional:</span>
                  <span className="font-bold text-gray-900">{confirmedAppointment.professional}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Data:</span>
                  <span className="font-bold text-gray-900">{confirmedAppointment.date} ({confirmedAppointment.weekday})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Horário:</span>
                  <span className="font-bold text-purple-700 text-base">{confirmedAppointment.time}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-100">
                  <span className="text-gray-500 font-bold">Valor Total:</span>
                  <span className="font-black text-emerald-600 text-base">R$ {confirmedAppointment.price.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={openWhatsAppConfirmation}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle size={18} />
                Enviar Confirmação pelo WhatsApp
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmedAppointment(null);
                  setSelectedTime('');
                  setStep(1);
                }}
                className="w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl font-bold text-xs transition-colors"
              >
                Fazer Outro Agendamento
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

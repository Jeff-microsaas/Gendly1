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
  CalendarCheck
} from 'lucide-react';
import { db, onDatabaseChange } from '../services/db';
import { Company, Product, Professional, Appointment, Client, CompanySettings, Promotion } from '../types';

interface PublicBookingPageProps {
  companyId: string;
  onExitPreview?: () => void;
}

const generateSlots = (start: string, end: string, intervalMinutes: number) => {
  const slots: string[] = [];
  try {
    const [startH, startM] = (start || '09:00').split(':').map(Number);
    const [endH, endM] = (end || '19:00').split(':').map(Number);
    const interval = intervalMinutes && intervalMinutes > 0 ? intervalMinutes : 30;

    let current = new Date();
    current.setHours(startH, startM, 0, 0);

    const finish = new Date();
    finish.setHours(endH, endM, 0, 0);

    while (current < finish) {
      slots.push(current.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
      current.setMinutes(current.getMinutes() + interval);
    }
  } catch (err) {
    console.error('Erro ao gerar horários:', err);
  }
  return slots.length > 0 ? slots : ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
};

export const PublicBookingPage: React.FC<PublicBookingPageProps> = ({ companyId, onExitPreview }) => {
  const [company, setCompany] = useState<Company | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [services, setServices] = useState<Product[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  
  // Client Info State
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

  // Load Company Data & Live Sync
  const loadData = useCallback(() => {
    if (!companyId) return;
    try {
      const companies = db.companies.getAll();
      const targetCompany = companies.find(c => c.id === companyId);
      if (targetCompany) {
        setCompany(targetCompany);
      }

      const compSettings = db.settings.get(companyId);
      setSettings(compSettings);

      const allProds = db.products.getAll();
      const compProds = allProds.filter(p => p.companyId === companyId && p.type === 'SERVICE');
      setServices(compProds);

      const allProfs = db.professionals.getAll();
      const compProfs = allProfs.filter(p => p.companyId === companyId);
      setProfessionals(compProfs);

      const allApts = db.appointments.getAll();
      const compApts = allApts.filter(a => a.companyId === companyId);
      setAppointments(compApts);

      const allPromos = db.promotions.getAll();
      const compPromos = allPromos.filter(p => p.companyId === companyId && p.active);
      setPromotions(compPromos);

      // Auto-select professional if only 1 exists
      if (compProfs.length === 1 && !selectedProfessional) {
        setSelectedProfessional(compProfs[0].nickname || compProfs[0].name);
      }
    } catch (err) {
      console.error('Erro ao carregar dados de agendamento:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedProfessional]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time synchronization via BroadcastChannel & Local Storage
  useEffect(() => {
    const unsubscribe = onDatabaseChange((key) => {
      if (
        key === 'gendly_db_table_appointments' || 
        key === 'gendly_db_table_professionals' || 
        key === 'gendly_db_table_products' || 
        key === 'gendly_db_table_settings'
      ) {
        // Trigger live visual pulse
        setLiveSyncPulse(true);
        setTimeout(() => setLiveSyncPulse(false), 800);
        loadData();
      }
    });

    // Also poll every 3 seconds to guarantee freshness across all browsers
    const interval = setInterval(() => {
      const freshApts = db.appointments.getAll().filter(a => a.companyId === companyId);
      setAppointments(freshApts);
    }, 3000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [companyId, loadData]);

  // Next 14 Available Dates (Starting from today)
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

  // Default selected date to today
  useEffect(() => {
    if (!selectedDate && availableDates.length > 0) {
      setSelectedDate(availableDates[0].iso);
    }
  }, [availableDates, selectedDate]);

  // Time Slots & Occupied Check (REAL TIME)
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
        // If a specific professional is selected, check conflicts for that professional
        if (!selectedProfessional || apt.professional === selectedProfessional) {
          busy.add(apt.time);
        }
      }
    });
    return busy;
  }, [selectedDate, appointments, selectedProfessional]);

  // Selected Service Details
  const currentService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId) || null;
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

  // Submit Booking
  const handleConfirmBooking = () => {
    if (!currentService || !selectedDate || !selectedTime || !clientName.trim() || !clientWhatsapp.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios (Serviço, Data, Horário, Nome e WhatsApp).');
      return;
    }

    // Double check if slot was taken in real-time just before clicking
    const freshApts = db.appointments.getAll().filter(a => a.companyId === companyId);
    const isConflict = freshApts.some(a => 
      a.rawDate === selectedDate && 
      a.time === selectedTime && 
      a.status !== 'Cancelado' &&
      (!selectedProfessional || a.professional === selectedProfessional)
    );

    if (isConflict) {
      alert('Atenção: Este horário acabou de ser reservado por outro cliente! Por favor, selecione outro horário disponível.');
      setAppointments(freshApts);
      setSelectedTime('');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Ensure client is registered or updated in db.clients
      const allClients = db.clients.getAll();
      let client = allClients.find(c => 
        c.companyId === companyId && 
        (c.whatsapp.replace(/\D/g, '') === clientWhatsapp.replace(/\D/g, '') || c.name.toLowerCase() === clientName.toLowerCase().trim())
      );

      if (!client) {
        client = {
          id: `cli_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          name: clientName.trim(),
          nickname: clientNickname.trim() || clientName.trim().split(' ')[0],
          whatsapp: clientWhatsapp.trim(),
          birthday: '',
          companyId,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(clientName.trim())}&background=f3e8ff&color=9333ea&bold=true`
        };
        db.clients.create(client);
      }

      // 2. Format Date
      const dateParts = selectedDate.split('-');
      const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}` : selectedDate;
      const dateObj = new Date(`${selectedDate}T12:00:00`);
      const weekday = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase();

      // 3. Find professional details
      const chosenProf = professionals.find(p => (p.nickname || p.name) === selectedProfessional) || professionals[0];
      const finalProfName = chosenProf ? (chosenProf.nickname || chosenProf.name) : 'Equipe';
      const profAvatar = chosenProf?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(finalProfName)}&background=f3e8ff&color=9333ea`;

      // 4. Create Appointment
      const newAppointment: Appointment = {
        id: `apt_pub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        companyId,
        time: selectedTime,
        date: formattedDate,
        rawDate: selectedDate,
        weekday,
        client: client.name,
        clientNickname: client.nickname || client.name.split(' ')[0],
        avatar: client.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(client.name)}&background=f3e8ff&color=9333ea`,
        phone: client.whatsapp,
        service: currentService.name,
        professional: finalProfName,
        professionalAvatar: profAvatar,
        status: 'Pendente', // Appears in "Próximos Atendimentos" ready to confirm/remind/reschedule
        price: effectivePrice,
        cost: currentService.cost || 0,
        category: currentService.category || 'Geral',
        notes: clientNotes ? `[Agendado Online]: ${clientNotes}` : '[Agendado pelo Link Online]'
      };

      db.appointments.create(newAppointment);

      setConfirmedAppointment(newAppointment);
      setStep(5); // Success step
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
    if (!confirmedAppointment || !company) return;
    const msg = `Olá! Acabei de realizar meu agendamento online no ${company.name}:\n\n` +
      `📅 Data: ${confirmedAppointment.date} (${confirmedAppointment.weekday})\n` +
      `⏰ Horário: ${confirmedAppointment.time}\n` +
      `✂️ Serviço: ${confirmedAppointment.service}\n` +
      `👤 Profissional: ${confirmedAppointment.professional}\n` +
      `💰 Valor: R$ ${confirmedAppointment.price.toFixed(2)}\n\n` +
      `Nome: ${confirmedAppointment.client}\n` +
      `Aguardo a confirmação!`;

    const phone = (company.whatsapp || '').replace(/\D/g, '');
    const url = phone ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-purple-100 flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-bold text-sm">Carregando horários em tempo real...</p>
        </div>
      </div>
    );
  }

  const companyName = settings?.companyName || company?.name || 'Studio & Beleza';
  const companySubName = settings?.companySubName || company?.subName || 'Agendamento Online';
  const companyLogo = settings?.logo || company?.logo;

  return (
    <div className="min-h-screen bg-slate-50 text-gray-900 flex flex-col selection:bg-purple-100 selection:text-purple-900">
      {/* Top Notification Bar for Real-time Connection */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 text-white py-2 px-4 shadow-sm text-xs font-semibold flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${liveSyncPulse ? 'bg-amber-300 scale-150' : 'bg-emerald-400 animate-pulse'} transition-all duration-300`}></span>
            <span>Agendamento Inteligente em Tempo Real</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopyLink}
              className="hover:underline flex items-center gap-1 text-[11px] opacity-90 hover:opacity-100"
              title="Copiar link desta página"
            >
              <Share2 size={12} />
              {copiedLink ? 'Link Copiado!' : 'Copiar Link'}
            </button>
            {onExitPreview && (
              <button
                onClick={onExitPreview}
                className="bg-white/20 hover:bg-white/30 text-white px-2.5 py-0.5 rounded text-[11px] font-bold transition-all"
              >
                Voltar ao Sistema
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Header with Business Brand */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 border border-purple-200 overflow-hidden flex items-center justify-center shrink-0 shadow-xs">
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
              ) : (
                <Building className="text-purple-600" size={24} />
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

          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            Horários sincronizados
          </div>
        </div>

        {/* Step Indicator (Steps 1 to 4) */}
        {step < 5 && (
          <div className="max-w-3xl mx-auto px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs font-bold text-gray-500">
            <button 
              onClick={() => setStep(1)} 
              className={`flex items-center gap-1.5 py-1 ${step === 1 ? 'text-purple-700 font-black' : step > 1 ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-purple-600 text-white' : step > 1 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>1</span>
              <span>Serviço</span>
            </button>
            <ChevronRight size={14} className="text-gray-300" />

            <button 
              onClick={() => currentService && setStep(2)} 
              disabled={!currentService} 
              className={`flex items-center gap-1.5 py-1 ${step === 2 ? 'text-purple-700 font-black' : step > 2 ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-purple-600 text-white' : step > 2 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>2</span>
              <span>Profissional</span>
            </button>
            <ChevronRight size={14} className="text-gray-300" />

            <button 
              onClick={() => currentService && setStep(3)} 
              disabled={!currentService} 
              className={`flex items-center gap-1.5 py-1 ${step === 3 ? 'text-purple-700 font-black' : step > 3 ? 'text-gray-900' : 'text-gray-400'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-purple-600 text-white' : step > 3 ? 'bg-purple-100 text-purple-700' : 'bg-gray-100'}`}>3</span>
              <span>Data & Hora</span>
            </button>
            <ChevronRight size={14} className="text-gray-300" />

            <button 
              onClick={() => currentService && selectedDate && selectedTime && setStep(4)} 
              disabled={!currentService || !selectedDate || !selectedTime} 
              className={`flex items-center gap-1.5 py-1 ${step === 4 ? 'text-purple-700 font-black' : 'text-gray-400'}`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 4 ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}>4</span>
              <span>Seus Dados</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 pb-24">
        {/* STEP 1: CHOOSE SERVICE */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Escolha o Serviço</h2>
              <p className="text-sm text-gray-500">Selecione o procedimento que deseja agendar.</p>
            </div>

            {services.length > 0 ? (
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
                        // Auto-advance to next step
                        setTimeout(() => setStep(2), 150);
                      }}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                        isSelected 
                          ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-400 shadow-md' 
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
            ) : (
              <div className="bg-white p-8 rounded-2xl border border-gray-200 text-center text-gray-500">
                <Scissors size={40} className="mx-auto mb-2 text-gray-300" />
                <p className="font-bold">Nenhum serviço disponível no momento.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CHOOSE PROFESSIONAL */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Escolha o Profissional</h2>
                <p className="text-sm text-gray-500">
                  {professionals.length === 1 
                    ? 'Profissional padrão já selecionado para seu atendimento.' 
                    : 'Selecione quem você prefere ou deixe em aberto para qualquer profissional.'}
                </p>
              </div>
              <button 
                onClick={() => setStep(1)} 
                className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
              >
                <ArrowLeft size={14} /> Trocar serviço
              </button>
            </div>

            {/* Selected Service Badge */}
            {currentService && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Scissors size={15} className="text-purple-600" />
                  <span className="font-bold text-gray-800">{currentService.name}</span>
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
                      ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-400 shadow-md' 
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
                        ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-400 shadow-md' 
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
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-100 transition-colors"
              >
                Voltar
              </button>
              <button
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
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900 mb-1">Escolha a Data e Horário</h2>
                <p className="text-sm text-gray-500">Horários disponíveis atualizados em tempo real.</p>
              </div>
              <button 
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
                  Horários Disponíveis
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
                          className="p-3 rounded-xl border border-gray-100 bg-gray-100/60 text-gray-300 text-center text-xs font-bold cursor-not-allowed select-none line-through"
                          title="Horário já reservado"
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
                          // Auto advance
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
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-100 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={!selectedTime}
                className="px-6 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar para Dados
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CLIENT DATA & FINAL CONFIRMATION BUTTON */}
        {step === 4 && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div>
              <h2 className="text-2xl font-black text-gray-900 mb-1">Seus Dados de Contato</h2>
              <p className="text-sm text-gray-500">Informe seus dados para finalizar e receber a confirmação.</p>
            </div>

            {/* Summary Card of Selection */}
            <div className="bg-gradient-to-br from-purple-50 via-white to-pink-50 p-4 sm:p-5 rounded-2xl border border-purple-100 shadow-xs space-y-3">
              <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarCheck size={14} className="text-purple-600" />
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
                  <span className="font-bold text-gray-900">{selectedProfessional || 'Qualquer disponível'}</span>
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
                  WhatsApp / Telefone Celular <span className="text-rose-500">*</span>
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
                <p className="text-[11px] text-gray-400 mt-1">Usaremos seu WhatsApp para confirmar e enviar lembretes.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Como prefere ser chamado? (Apelido - Opcional)
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
                className="w-full py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors text-center"
              >
                Voltar e alterar horário
              </button>
            </div>
          </div>
        )}

        {/* STEP 5: SUCCESS CONFIRMATION SCREEN */}
        {step === 5 && confirmedAppointment && (
          <div className="space-y-6 animate-in zoom-in-95 duration-300 text-center max-w-lg mx-auto py-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm ring-8 ring-emerald-50">
              <CheckCircle2 size={42} />
            </div>

            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-gray-900 mb-2">Agendamento Realizado!</h2>
              <p className="text-sm text-gray-600">
                Seu horário foi reservado com sucesso no sistema e já aparece em tempo real para a equipe.
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
                onClick={openWhatsAppConfirmation}
                className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold text-sm shadow-md shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle size={18} />
                Enviar Confirmação pelo WhatsApp
              </button>

              <button
                onClick={() => {
                  setConfirmedAppointment(null);
                  setSelectedServiceId('');
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

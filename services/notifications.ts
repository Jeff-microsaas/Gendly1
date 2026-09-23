/**
 * SERVIÇO DE NOTIFICAÇÕES DE ATENDIMENTO DO GENDLY
 * Notificações nativas do sistema operacional (Desktop e Mobile)
 * Funciona com a tela minimizada, em segundo plano ou em outras abas.
 */

import { Appointment } from '../types';

let swRegistration: ServiceWorkerRegistration | null = null;
let audioCtx: AudioContext | null = null;

/**
 * Toca um som de notificação harmonioso usando Web Audio API
 */
export function playNotificationSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // Nota 1 (Dó5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Nota 2 (Sol5)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.12);
    gain2.gain.setValueAtTime(0.35, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);

    // Nota 3 (Dó6)
    const osc3 = audioCtx.createOscillator();
    const gain3 = audioCtx.createGain();
    osc3.type = 'triangle';
    osc3.frequency.setValueAtTime(1046.50, now + 0.25);
    gain3.gain.setValueAtTime(0.4, now + 0.25);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc3.connect(gain3);
    gain3.connect(audioCtx.destination);
    osc3.start(now + 0.25);
    osc3.stop(now + 0.8);
  } catch (err) {
    console.warn('[NotificationSound] Erro ao tocar áudio:', err);
  }
}

/**
 * Inicializa o Service Worker para suporte a notificações em segundo plano
 */
export async function initNotificationService(): Promise<void> {
  if (typeof window === 'undefined') return;

  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      swRegistration = registration;
      console.log('[NotificationService] Service Worker registrado com sucesso!');
    } catch (err) {
      console.warn('[NotificationService] Registro do Service Worker falhou, usando fallback direto:', err);
    }
  }
}

/**
 * Retorna o status atual da permissão de notificação
 */
export function getNotificationPermissionStatus(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Solicita permissão para o usuário receber notificações do sistema
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    alert('Seu navegador não possui suporte para notificações do sistema.');
    return false;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Dispara som de teste e notificação imediata de confirmação
      playNotificationSound();
      await triggerSystemNotification(
        '🔔 Notificações Ativadas!',
        {
          body: 'Você receberá avisos sonoros e no sistema quando um atendimento estiver iniciando!',
          tag: 'test-notification'
        }
      );
      return true;
    }
    return false;
  } catch (err) {
    console.error('[NotificationService] Erro ao solicitar permissão:', err);
    return false;
  }
}

/**
 * Dispara uma notificação nativa do sistema (aparece mesmo com o navegador minimizado)
 */
export async function triggerSystemNotification(
  title: string,
  options: NotificationOptions = {}
): Promise<void> {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  // Toca o som de alerta
  playNotificationSound();

  const defaultOptions: any = {
    icon: 'https://ui-avatars.com/api/?name=Gendly&background=9333ea&color=ffffff',
    badge: 'https://ui-avatars.com/api/?name=G&background=9333ea&color=ffffff',
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: true,
    ...options
  };

  try {
    // 1. Tentar via Service Worker
    if (swRegistration && 'showNotification' in swRegistration) {
      await swRegistration.showNotification(title, defaultOptions);
      return;
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SHOW_NOTIFICATION',
        title,
        options: defaultOptions
      });
      return;
    }

    // 2. Fallback: via Notification direta
    new Notification(title, defaultOptions);
  } catch (err) {
    console.warn('[NotificationService] Fallback de notificação acionado:', err);
    try {
      new Notification(title, defaultOptions);
    } catch (fallbackErr) {
      console.error('[NotificationService] Erro total ao exibir notificação:', fallbackErr);
    }
  }
}

// Chave para armazenar notificações já disparadas no dia
const NOTIFIED_KEY = 'gendly_notified_alerts_cache';

function getNotifiedCache(): Record<string, number> {
  try {
    const raw = localStorage.getItem(NOTIFIED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markAsNotified(key: string): void {
  try {
    const cache = getNotifiedCache();
    cache[key] = Date.now();
    localStorage.setItem(NOTIFIED_KEY, JSON.stringify(cache));
  } catch {
    // ignore
  }
}

function hasBeenNotified(key: string): boolean {
  const cache = getNotifiedCache();
  return !!cache[key];
}

/**
 * Verifica atendimentos e dispara notificações de início e prévias
 */
export function checkAndNotifyAppointments(
  appointments: Appointment[],
  companyId: string,
  alertMinutesBefore: number = 10
): void {
  if (typeof window === 'undefined') return;

  const now = new Date();
  const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD

  // REGRA ESTRITA: A notificação de início de atendimento só deve aparecer para cards
  // que estão em próximos atendimentos de hoje e que estão CONFIRMADOS (apt.status === 'Confirmado').
  // Caso não estejam confirmados (ex: Pendente, Agendado, Cancelado), não gera notificação!
  const todaysAppointments = appointments.filter(apt => 
    String(apt.companyId || '').trim().toLowerCase() === String(companyId || '').trim().toLowerCase() && 
    apt.status === 'Confirmado' && 
    apt.rawDate === todayStr
  );

  todaysAppointments.forEach(apt => {
    if (!apt.time) return;

    const [hours, minutes] = apt.time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) return;

    const aptTime = new Date();
    aptTime.setHours(hours, minutes, 0, 0);

    const diffMs = aptTime.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    // 1. ALERTA DE INÍCIO IMEDIATO (entre 1 minuto antes até 2 minutos depois do horário exato)
    const startKey = `${todayStr}_apt_${apt.id}_start`;
    if (diffMins <= 1 && diffMins >= -2 && !hasBeenNotified(startKey)) {
      markAsNotified(startKey);
      
      const title = `🚨 INÍCIO DE ATENDIMENTO: ${apt.client}`;
      const body = `Horário: ${apt.time} - ${apt.service} com ${apt.professional}. O atendimento está começando agora!`;
      
      triggerSystemNotification(title, {
        body,
        tag: startKey,
        data: { url: '/', appointmentId: apt.id }
      });
    }

    // 2. ALERTA PRÉVIO (ex: 10 minutos antes)
    const priorKey = `${todayStr}_apt_${apt.id}_prior`;
    if (diffMins > 1 && diffMins <= alertMinutesBefore && !hasBeenNotified(priorKey)) {
      markAsNotified(priorKey);

      const title = `⏰ Atendimento em ${diffMins} min: ${apt.client}`;
      const body = `${apt.service} agendado para às ${apt.time} com ${apt.professional}. Prepare-se!`;

      triggerSystemNotification(title, {
        body,
        tag: priorKey,
        data: { url: '/', appointmentId: apt.id }
      });
    }
  });
}

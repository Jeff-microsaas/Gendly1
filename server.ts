import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json({ limit: '15mb' }));

// Ensure data directory exists
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'db.json');

// Initial seed data
const DEFAULT_STORE = {
  companies: [
    {
      id: 'studio-alana-moreira',
      name: 'Studio Alana Moreira',
      subName: 'Estética & Beleza Premium',
      logo: 'https://ui-avatars.com/api/?name=Studio+Alana+Moreira&background=fdf4ff&color=9333ea',
      taxId: '22.222.222/0001-22',
      businessType: 'PJ',
      plan: 'PREMIUM',
      neverExpires: true,
      address: 'Av. Paulista, 1000 - Jardins',
      whatsapp: '11999998888',
      instagram: '@studioalanamoreira'
    },
    {
      id: '1',
      name: 'Studio Beleza Pura',
      subName: 'Estética & Bem-estar',
      logo: 'https://ui-avatars.com/api/?name=Studio+Beleza+Pura&background=fce7f3&color=db2777',
      taxId: '00.000.000/0001-00',
      businessType: 'PJ',
      plan: 'PREMIUM',
      neverExpires: true,
      address: 'Rua Oscar Freire, 500 - Cerqueira César',
      whatsapp: '11988887777',
      instagram: '@belezapura_studio'
    }
  ],
  products: [
    // Serviços exclusivos do Studio Alana Moreira
    {
      id: 'prod-alana-1',
      companyId: 'studio-alana-moreira',
      name: 'Limpeza de Pele Profunda',
      price: 180.00,
      cost: 40.00,
      duration: '1h 20m',
      category: 'Estética Facial',
      type: 'SERVICE',
      subtype: 'SINGLE',
      description: 'Higienização profunda com extração, esfoliação e máscara de alta frequência.',
      image: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&q=80'
    },
    {
      id: 'prod-alana-2',
      companyId: 'studio-alana-moreira',
      name: 'Design de Sobrancelhas com Henna',
      price: 65.00,
      cost: 15.00,
      duration: '45m',
      category: 'Olhar & Sobrancelhas',
      type: 'SERVICE',
      subtype: 'SINGLE',
      description: 'Mapeamento geométrico facial e aplicação de henna natural.',
      image: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80'
    },
    {
      id: 'prod-alana-3',
      companyId: 'studio-alana-moreira',
      name: 'Pacote Revitalização Facial (4 Sessões)',
      price: 580.00,
      cost: 120.00,
      duration: '1h',
      category: 'Pacotes',
      type: 'SERVICE',
      subtype: 'PACKAGE',
      sessionCount: 4,
      description: 'Tratamento intensivo anti-idade e clareamento facial.',
      image: 'https://images.unsplash.com/photo-1512290900672-1f5517e4526d?w=400&q=80'
    },
    // Serviços cadastrados para o Studio Beleza Pura
    {
      id: '1',
      companyId: '1',
      name: 'Protocolo Glow 24k',
      price: 450.00,
      cost: 60.00,
      duration: '1h 30m',
      category: 'Tratamentos Exclusivos',
      type: 'SERVICE',
      subtype: 'SINGLE',
      description: 'Tratamento iluminador com partículas de ouro.',
      image: 'https://images.unsplash.com/photo-1512290900672-1f5517e4526d?w=400&q=80'
    },
    {
      id: '2',
      companyId: '1',
      name: 'Essência Floral Rose',
      price: 180.00,
      cost: 25.00,
      duration: '1h',
      category: 'Corporal',
      type: 'SERVICE',
      subtype: 'SINGLE',
      description: 'Óleo essencial de rosas para harmonização e massagem relaxante.',
      image: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=400&q=80'
    },
    {
      id: '3',
      companyId: '1',
      name: 'Corte Bordado',
      price: 120.00,
      cost: 20.00,
      duration: '50m',
      category: 'Cabelos',
      type: 'SERVICE',
      subtype: 'SINGLE',
      description: 'Remoção de pontas duplas sem tirar comprimento do cabelo.',
      image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=400&q=80'
    },
    {
      id: '4',
      companyId: '1',
      name: 'Pacote Noiva',
      price: 1500.00,
      cost: 300.00,
      duration: '4h',
      category: 'Pacotes',
      type: 'SERVICE',
      subtype: 'PACKAGE',
      sessionCount: 3,
      description: 'Dia completo da noiva com cuidados especiais.',
      image: null
    }
  ],
  professionals: [
    // Profissionais exclusivos do Studio Alana Moreira
    {
      id: 'prof-alana-1',
      companyId: 'studio-alana-moreira',
      name: 'Alana Moreira',
      nickname: 'Alana',
      specialties: ['Estética Facial', 'Design de Sobrancelhas'],
      specialtyId: 'spec-alana-1',
      avatar: 'https://ui-avatars.com/api/?name=Alana+Moreira&background=fdf4ff&color=9333ea',
      email: 'alana@studioalanamoreira.com',
      whatsapp: '11999887766',
      role: 'Especialista Master',
      commission: 100
    },
    {
      id: 'prof-alana-2',
      companyId: 'studio-alana-moreira',
      name: 'Camila Rocha',
      nickname: 'Cami',
      specialties: ['Estética Facial', 'Spa Facial'],
      specialtyId: 'spec-alana-2',
      avatar: 'https://ui-avatars.com/api/?name=Camila+Rocha&background=fee2e2&color=e11d48',
      email: 'camila@studioalanamoreira.com',
      whatsapp: '11988774433',
      role: 'Terapeuta Estética',
      commission: 60
    },
    // Profissionais cadastrados para o Studio Beleza Pura
    {
      id: '1',
      companyId: '1',
      name: 'Juliana Santos',
      nickname: 'Ju',
      specialties: ['Tratamentos Exclusivos', 'Corporal'],
      specialtyId: '1',
      avatar: 'https://ui-avatars.com/api/?name=Ju&background=f3e8ff&color=9333ea',
      email: 'juliana@belezapura.com',
      whatsapp: '11999990001',
      role: 'Esteticista Sênior',
      commission: 50
    },
    {
      id: '2',
      companyId: '1',
      name: 'Priscila Alencar',
      nickname: 'Pri',
      specialties: ['Cabelos', 'Colorimetria'],
      specialtyId: '2',
      avatar: 'https://ui-avatars.com/api/?name=Pri&background=ec4899&color=fff',
      email: 'priscila@belezapura.com',
      whatsapp: '11999990002',
      role: 'Terapeuta Capilar',
      commission: 50
    }
  ],
  appointments: [],
  clients: []
};

// In-memory cache + persistent file sync
let dbStore: typeof DEFAULT_STORE = { ...DEFAULT_STORE };
const deletedAppointmentIds: Set<string> = new Set();

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      dbStore = {
        companies: parsed.companies || DEFAULT_STORE.companies,
        products: parsed.products || DEFAULT_STORE.products,
        professionals: parsed.professionals || DEFAULT_STORE.professionals,
        appointments: (parsed.appointments || []).filter((a: any) => !deletedAppointmentIds.has(String(a.id))),
        clients: parsed.clients || []
      };
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error('[Server DB] Error reading db.json, using defaults:', err);
    saveDatabase();
  }
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbStore, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Server DB] Error saving db.json:', err);
  }
}

loadDatabase();

// SSE (Server-Sent Events) clients for live updates
const sseClients: Response[] = [];

function broadcastSSE(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = sseClients.length - 1; i >= 0; i--) {
    try {
      sseClients[i].write(payload);
    } catch {
      sseClients.splice(i, 1);
    }
  }
}

// 1. Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: Date.now(), appointmentsCount: dbStore.appointments.length });
});

// 2. SSE stream for real-time notification to owner's dashboard
app.get('/api/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  sseClients.push(res);

  const keepAliveInterval = setInterval(() => {
    try {
      res.write(': keepalive\n\n');
    } catch {
      clearInterval(keepAliveInterval);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAliveInterval);
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
  });
});

// 3. Public Booking Info Endpoint (used by smartphones / external browsers)
app.get('/api/companies/:companyId/booking-data', (req: Request, res: Response) => {
  const targetCompanyId = String(req.params.companyId || '').trim().toLowerCase();

  // Find company
  let company = dbStore.companies.find(c => String(c.id).trim().toLowerCase() === targetCompanyId);
  if (!company && targetCompanyId === '1') {
    company = dbStore.companies[0];
  }

  // Filter ONLY this company's registered services
  const services = dbStore.products.filter(p => 
    String(p.companyId || '').trim().toLowerCase() === targetCompanyId && 
    (p.type === 'SERVICE' || !p.type)
  );

  // Filter ONLY this company's registered professionals
  const professionals = dbStore.professionals.filter(p => 
    String(p.companyId || '').trim().toLowerCase() === targetCompanyId
  );

  // Busy slots for this company (active appointments, without leaking client personal details)
  const busySlots = dbStore.appointments
    .filter(a => String(a.companyId || '').trim().toLowerCase() === targetCompanyId && a.status !== 'Cancelado')
    .map(a => ({
      rawDate: a.rawDate,
      time: a.time,
      professional: a.professional
    }));

  res.json({
    company: company || {
      id: targetCompanyId,
      name: 'Studio de Beleza',
      subName: 'Estética & Bem-estar',
      logo: 'https://ui-avatars.com/api/?name=Studio&background=fdf4ff&color=9333ea',
      plan: 'PREMIUM'
    },
    services,
    professionals,
    busySlots
  });
});

// 4. Appointments list & creation & deletion
app.get('/api/appointments', (req: Request, res: Response) => {
  const companyId = req.query.companyId ? String(req.query.companyId).trim().toLowerCase() : null;
  let list = dbStore.appointments.filter(a => !deletedAppointmentIds.has(String(a.id)));
  if (companyId) {
    list = list.filter(a => String(a.companyId || '').trim().toLowerCase() === companyId);
  }
  res.json(list);
});

app.post('/api/appointments', (req: Request, res: Response) => {
  try {
    const newApt = req.body;
    if (!newApt || !newApt.time || !newApt.rawDate) {
      return res.status(400).json({ error: 'Dados de agendamento incompletos' });
    }

    const aptId = String(newApt.id || Date.now());
    // Never allow a previously deleted appointment to be re-created by stale sync
    if (deletedAppointmentIds.has(aptId)) {
      return res.json({ success: true, ignored: true });
    }

    // Double check if appointment exists
    const exists = dbStore.appointments.some(a => String(a.id) === aptId);
    if (exists) {
      dbStore.appointments = dbStore.appointments.map(a => String(a.id) === aptId ? { ...a, ...newApt } : a);
    } else {
      // Ensure correct status and attributes
      const formattedApt = {
        ...newApt,
        id: newApt.id || Date.now(),
        status: newApt.status || 'Pendente',
        companyId: String(newApt.companyId || '1').trim()
      };
      dbStore.appointments.unshift(formattedApt);
    }

    // If client info included, save/upsert client
    if (newApt.client && newApt.companyId) {
      const existingClientIdx = dbStore.clients.findIndex(c => 
        String(c.companyId).trim().toLowerCase() === String(newApt.companyId).trim().toLowerCase() && 
        c.name.toLowerCase() === newApt.client.toLowerCase()
      );
      if (existingClientIdx >= 0) {
        if (newApt.phone) dbStore.clients[existingClientIdx].whatsapp = newApt.phone;
      } else {
        dbStore.clients.unshift({
          id: `cli-${Date.now()}`,
          companyId: String(newApt.companyId).trim(),
          name: newApt.client,
          nickname: newApt.clientNickname || newApt.client.split(' ')[0],
          whatsapp: newApt.phone || '',
          avatar: newApt.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(newApt.client)}&background=f3e8ff&color=9333ea`
        });
      }
    }

    saveDatabase();

    // Broadcast to SSE clients instantly
    broadcastSSE('appointment_created', newApt);
    broadcastSSE('database_updated', { appointments: dbStore.appointments });

    res.json({ success: true, appointment: newApt });
  } catch (err: any) {
    console.error('[Server DB] Error saving appointment:', err);
    res.status(500).json({ error: 'Erro ao salvar agendamento no servidor' });
  }
});

// EXCLUSÃO DEFINITIVA DE AGENDAMENTO (Elimina o loop de volta do card)
app.delete('/api/appointments/:id', (req: Request, res: Response) => {
  try {
    const aptId = String(req.params.id);
    deletedAppointmentIds.add(aptId);
    dbStore.appointments = dbStore.appointments.filter(a => String(a.id) !== aptId);
    saveDatabase();

    // Notifica todos os navegadores e dashboards para remover imediatamente
    broadcastSSE('appointment_deleted', { id: aptId });
    broadcastSSE('database_updated', { appointments: dbStore.appointments });

    res.json({ success: true, id: aptId });
  } catch (err) {
    console.error('[Server DB] Error deleting appointment:', err);
    res.status(500).json({ error: 'Erro ao excluir agendamento' });
  }
});

// 5. Full sync endpoints (dashboard sync with server store)
app.get('/api/sync', (req: Request, res: Response) => {
  const companyId = req.query.companyId ? String(req.query.companyId).trim().toLowerCase() : null;
  if (companyId) {
    return res.json({
      companies: dbStore.companies.filter(c => String(c.id).trim().toLowerCase() === companyId),
      products: dbStore.products.filter(p => String(p.companyId || '').trim().toLowerCase() === companyId),
      professionals: dbStore.professionals.filter(p => String(p.companyId || '').trim().toLowerCase() === companyId),
      appointments: dbStore.appointments.filter(a => String(a.companyId || '').trim().toLowerCase() === companyId && !deletedAppointmentIds.has(String(a.id))),
      clients: dbStore.clients.filter(c => String(c.companyId || '').trim().toLowerCase() === companyId)
    });
  }
  res.json(dbStore);
});

app.post('/api/sync', (req: Request, res: Response) => {
  try {
    const payload = req.body;
    let hasChanges = false;
    const targetComp = payload.companyId ? String(payload.companyId).trim().toLowerCase() : null;

    if (targetComp) {
      // Sincronização autoritativa para a empresa atual: substitui os produtos e profissionais
      // para eliminar qualquer sujeira ou dados de outras empresas!
      if (Array.isArray(payload.products)) {
        dbStore.products = dbStore.products
          .filter(p => String(p.companyId || '').trim().toLowerCase() !== targetComp)
          .concat(payload.products);
        hasChanges = true;
      }

      if (Array.isArray(payload.professionals)) {
        dbStore.professionals = dbStore.professionals
          .filter(p => String(p.companyId || '').trim().toLowerCase() !== targetComp)
          .concat(payload.professionals);
        hasChanges = true;
      }

      if (Array.isArray(payload.appointments)) {
        const cleanIncomingApts = payload.appointments.filter((a: any) => !deletedAppointmentIds.has(String(a.id)));
        dbStore.appointments = dbStore.appointments
          .filter(a => String(a.companyId || '').trim().toLowerCase() !== targetComp)
          .concat(cleanIncomingApts);
        hasChanges = true;
      }

      if (Array.isArray(payload.clients)) {
        dbStore.clients = dbStore.clients
          .filter(c => String(c.companyId || '').trim().toLowerCase() !== targetComp)
          .concat(payload.clients);
        hasChanges = true;
      }

      if (Array.isArray(payload.companies) && payload.companies.length > 0) {
        for (const comp of payload.companies) {
          const idx = dbStore.companies.findIndex(c => String(c.id).trim().toLowerCase() === String(comp.id).trim().toLowerCase());
          if (idx >= 0) dbStore.companies[idx] = { ...dbStore.companies[idx], ...comp };
          else dbStore.companies.push(comp);
        }
        hasChanges = true;
      }
    } else {
      if (Array.isArray(payload.companies) && payload.companies.length > 0) {
        for (const comp of payload.companies) {
          const idx = dbStore.companies.findIndex(c => String(c.id).trim().toLowerCase() === String(comp.id).trim().toLowerCase());
          if (idx >= 0) dbStore.companies[idx] = { ...dbStore.companies[idx], ...comp };
          else dbStore.companies.push(comp);
        }
        hasChanges = true;
      }

      if (Array.isArray(payload.products) && payload.products.length > 0) {
        for (const p of payload.products) {
          const idx = dbStore.products.findIndex(existing => String(existing.id) === String(p.id));
          if (idx >= 0) dbStore.products[idx] = { ...dbStore.products[idx], ...p };
          else dbStore.products.push(p);
        }
        hasChanges = true;
      }

      if (Array.isArray(payload.professionals) && payload.professionals.length > 0) {
        for (const p of payload.professionals) {
          const idx = dbStore.professionals.findIndex(existing => String(existing.id) === String(p.id));
          if (idx >= 0) dbStore.professionals[idx] = { ...dbStore.professionals[idx], ...p };
          else dbStore.professionals.push(p);
        }
        hasChanges = true;
      }

      if (Array.isArray(payload.appointments) && payload.appointments.length > 0) {
        const existingMap = new Map(dbStore.appointments.map(a => [String(a.id), a]));
        for (const apt of payload.appointments) {
          if (!deletedAppointmentIds.has(String(apt.id))) {
            existingMap.set(String(apt.id), apt);
          }
        }
        dbStore.appointments = Array.from(existingMap.values());
        hasChanges = true;
      }

      if (Array.isArray(payload.clients) && payload.clients.length > 0) {
        const existingMap = new Map(dbStore.clients.map(c => [String(c.id), c]));
        for (const cli of payload.clients) {
          existingMap.set(String(cli.id), cli);
        }
        dbStore.clients = Array.from(existingMap.values());
        hasChanges = true;
      }
    }

    if (Array.isArray(payload.clients) && payload.clients.length > 0) {
      const existingMap = new Map(dbStore.clients.map(c => [String(c.id), c]));
      for (const cli of payload.clients) {
        existingMap.set(String(cli.id), cli);
      }
      dbStore.clients = Array.from(existingMap.values());
      hasChanges = true;
    }

    if (hasChanges) {
      saveDatabase();
      broadcastSSE('database_updated', {
        appointments: dbStore.appointments,
        products: dbStore.products,
        professionals: dbStore.professionals
      });
    }

    res.json({ success: true, appointments: dbStore.appointments });
  } catch (err) {
    console.error('[Server DB] Sync error:', err);
    res.status(500).json({ error: 'Erro ao sincronizar dados' });
  }
});

// Setup Vite or Static File Serving
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Gendly Server] Rodando na porta ${PORT} (${isProduction ? 'Produção' : 'Desenvolvimento'})`);
  });
}

startServer();

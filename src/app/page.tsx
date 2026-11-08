"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "dashboard" | "clientes" | "equipamentos";

type Address = {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  zipCode: string;
  complement: string;
  reference?: string;
  locationUrl?: string;
};

type Customer = {
  id: string;
  name: string;
  document: string;
  phone: string;
  email: string;
  city: string;
  address?: Address;
  workAddresses?: Address[];
};

type Equipment = {
  id: string;
  name: string;
  category: string;
  billing: string;
  active: boolean;
  rules: string;
};

const initialEquipment: Equipment[] = [
  {
    id: "martelete-10",
    name: "Martelete 10 kg",
    category: "Martelete",
    billing: "Diária",
    active: true,
    rules: "R$ 100,00 por dia",
  },
  {
    id: "martelete-15",
    name: "Martelete 15 kg",
    category: "Martelete",
    billing: "Diária",
    active: true,
    rules: "R$ 150,00 por dia",
  },
  {
    id: "compactador",
    name: "Compactador / Vibrador",
    category: "Compactação",
    billing: "Diária",
    active: true,
    rules: "R$ 80,00 por dia",
  },
  {
    id: "betoneira",
    name: "Betoneira",
    category: "Mistura",
    billing: "Por período",
    active: true,
    rules: "1d: R$ 100,00 · 2–7d: R$ 200,00 · 8–15d: R$ 300,00",
  },
  {
    id: "andaime",
    name: "Andaime",
    category: "Acesso",
    billing: "Por período",
    active: true,
    rules: "1–7d: R$ 6,00 · 8–15d: R$ 9,00 · 16–31d: R$ 15,00",
  },
];

const navigation: { id: View; label: string; icon: string }[] = [
  { id: "dashboard", label: "Visão geral", icon: "⌂" },
  { id: "clientes", label: "Clientes", icon: "♙" },
  { id: "equipamentos", label: "Equipamentos", icon: "▣" },
];

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = window.localStorage.getItem(key);
    return saved ? (JSON.parse(saved) as T) : fallback;
  } catch {
    return fallback;
  }
}

export default function Home() {
  const [view, setView] = useState<View>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCustomers(readStorage<Customer[]>("amigo-customers", []));
      setEquipment(readStorage<Equipment[]>("amigo-equipment", initialEquipment));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("amigo-customers", JSON.stringify(customers));
      window.localStorage.setItem("amigo-equipment", JSON.stringify(equipment));
    }
  }, [customers, equipment]);

  const activeEquipment = useMemo(
    () => equipment.filter((item) => item.active).length,
    [equipment],
  );

  function navigate(nextView: View) {
    setView(nextView);
    setMenuOpen(false);
    setNotice("");
  }

  function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const customer: Customer = {
      id: crypto.randomUUID(),
      name: String(data.get("name") ?? ""),
      document: String(data.get("document") ?? ""),
      phone: String(data.get("phone") ?? ""),
      email: String(data.get("email") ?? ""),
      city: String(data.get("city") ?? ""),
      address: {
        street: String(data.get("customerStreet") ?? ""),
        number: String(data.get("customerNumber") ?? ""),
        neighborhood: String(data.get("customerNeighborhood") ?? ""),
        city: String(data.get("customerCity") ?? ""),
        zipCode: String(data.get("customerZipCode") ?? ""),
        complement: String(data.get("customerComplement") ?? ""),
      },
      workAddresses: Array.from({ length: Number(data.get("workAddressCount") ?? 1) }, (_, index) => ({
        street: String(data.get(`workStreet-${index}`) ?? ""),
        number: String(data.get(`workNumber-${index}`) ?? ""),
        neighborhood: String(data.get(`workNeighborhood-${index}`) ?? ""),
        city: String(data.get(`workCity-${index}`) ?? ""),
        zipCode: String(data.get(`workZipCode-${index}`) ?? ""),
        complement: String(data.get(`workComplement-${index}`) ?? ""),
        reference: String(data.get(`workReference-${index}`) ?? ""),
        locationUrl: String(data.get(`workLocation-${index}`) ?? ""),
      })),
    };
    setCustomers((current) => [...current, customer]);
    setShowCustomerForm(false);
    setNotice("Cliente cadastrado com sucesso.");
    event.currentTarget.reset();
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">A</div>
          <div>
            <strong>AMIGO</strong>
            <span>LOCAÇÕES</span>
          </div>
          <button className="close-menu" onClick={() => setMenuOpen(false)} aria-label="Fechar menu">×</button>
        </div>
        <nav className="main-nav" aria-label="Navegação principal">
          <small>MENU PRINCIPAL</small>
          {navigation.map((item) => (
            <button
              className={`nav-item ${view === item.id ? "nav-item-active" : ""}`}
              key={item.id}
              onClick={() => navigate(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
          <small className="nav-section">OPERAÇÃO</small>
          <button className="nav-item nav-item-muted" onClick={() => setNotice("O módulo de recolhimentos será desenvolvido na Fase 4.")}>
            <span className="nav-icon">↗</span>
            Recolhimentos
            <span className="soon">breve</span>
          </button>
          <button className="nav-item nav-item-muted" onClick={() => setNotice("O módulo financeiro será desenvolvido na Fase 3.")}>
            <span className="nav-icon">▤</span>
            Financeiro
            <span className="soon">breve</span>
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="config-icon">⚙</div>
          <div><strong>Modo local</strong><span>Configure o Supabase para produção</span></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Abrir menu">☰</button>
          <div className="breadcrumb"><span>Amigo Locações</span><b>/</b><strong>{pageTitle(view)}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Notificações">♢<i /></button>
            <div className="user-avatar">JL</div>
            <div className="user-info"><strong>Administrador</strong><span>Gestor</span></div>
          </div>
        </header>

        <div className="page-content">
          {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
          {view === "dashboard" && <Dashboard customers={customers} activeEquipment={activeEquipment} navigate={navigate} onNotice={setNotice} />}
          {view === "clientes" && (
            <Customers
              customers={customers}
              showForm={showCustomerForm}
              setShowForm={setShowCustomerForm}
              onSubmit={saveCustomer}
            />
          )}
          {view === "equipamentos" && <EquipmentList equipment={equipment} setEquipment={setEquipment} onNotice={setNotice} />}
        </div>
      </main>
    </div>
  );
}

function pageTitle(view: View) {
  return view === "dashboard" ? "Visão geral" : view[0].toUpperCase() + view.slice(1);
}

function Dashboard({ customers, activeEquipment, navigate, onNotice }: { customers: Customer[]; activeEquipment: number; navigate: (view: View) => void; onNotice: (message: string) => void }) {
  const cards = [
    { label: "Clientes cadastrados", value: customers.length, icon: "♙", action: () => navigate("clientes"), tone: "purple" },
    { label: "Equipamentos ativos", value: activeEquipment, icon: "▣", action: () => navigate("equipamentos"), tone: "blue" },
    { label: "Locações ativas", value: 0, icon: "↗", action: () => undefined, tone: "green" },
    { label: "Pagamentos pendentes", value: 0, icon: "R$", action: () => undefined, tone: "orange" },
  ];
  return (
    <>
      <section className="welcome">
        <div><p className="eyebrow">SEGUNDA-FEIRA, 08 DE NOVEMBRO DE 2026</p><h1>Olá, administrador <span>👋</span></h1><p>Acompanhe a operação da Amigo Locações em um só lugar.</p></div>
        <button className="primary-button" onClick={() => navigate("clientes")}><span>+</span> Novo cliente</button>
      </section>
      <section className="metrics-grid">
        {cards.map((card) => <button className="metric-card" key={card.label} onClick={card.action}><div className={`metric-icon ${card.tone}`}>{card.icon}</div><div><span>{card.label}</span><strong>{card.value}</strong></div><b className="metric-arrow">›</b></button>)}
      </section>
      <div className="dashboard-grid">
        <section className="panel alert-panel"><div className="panel-heading"><div><p className="eyebrow">ATENÇÃO</p><h2>Alertas da operação</h2></div><span className="counter">0</span></div><div className="empty-state"><div className="empty-icon">✓</div><strong>Tudo em dia por aqui</strong><p>Novos alertas aparecerão quando houver locações ou pagamentos cadastrados.</p></div></section>
        <section className="panel"><div className="panel-heading"><div><p className="eyebrow">RESUMO</p><h2>Atividade recente</h2></div><button className="text-button">Ver tudo</button></div><div className="empty-state compact"><div className="empty-icon soft">◷</div><strong>Nenhuma atividade ainda</strong><p>Cadastre seu primeiro cliente para começar.</p></div></section>
      </div>
      <section className="setup-banner"><div className="setup-mark">✦</div><div><strong>Próximo passo: conectar seu banco de dados</strong><p>O modo local salva os dados somente neste navegador. Configure o Supabase antes de usar em produção.</p></div><button className="secondary-button" onClick={() => onNotice("As credenciais do Supabase serão adicionadas na próxima etapa.")}>Ver configuração</button></section>
    </>
  );
}

function Customers({ customers, showForm, setShowForm, onSubmit }: { customers: Customer[]; showForm: boolean; setShowForm: (value: boolean) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  const [workAddressCount, setWorkAddressCount] = useState(1);

  return <section><div className="section-heading"><div><p className="eyebrow">CADASTRO</p><h1>Clientes</h1><p>Gerencie os dados do cliente e os endereços das obras.</p></div><button className="primary-button" onClick={() => setShowForm(!showForm)}><span>+</span> Novo cliente</button></div>
    {showForm && <form className="form-card" onSubmit={onSubmit}>
      <div className="form-heading"><div><h2>Novo cliente</h2><p className="form-description">O endereço da obra será usado para entregar e recolher os equipamentos.</p></div><button type="button" className="close-form" onClick={() => setShowForm(false)}>×</button></div>
      <div className="form-section"><div className="form-section-title"><span>1</span><div><h3>Dados do cliente</h3><p>Informações para contato e identificação.</p></div></div><div className="form-grid"><label>Nome completo ou razão social<input required name="name" placeholder="Ex.: João da Silva" /></label><label>CPF/CNPJ<input required name="document" placeholder="000.000.000-00" /></label><label>Telefone / WhatsApp<input name="phone" placeholder="(00) 00000-0000" /></label><label>E-mail<input type="email" name="email" placeholder="cliente@email.com" /></label></div></div>
      <div className="form-section"><div className="form-section-title"><span>2</span><div><h3>Endereço do cliente</h3><p>Endereço residencial ou comercial para cadastro.</p></div></div><div className="form-grid"><label className="wide-field">Rua / Avenida<input required name="customerStreet" placeholder="Nome da rua ou avenida" /></label><label>Número<input required name="customerNumber" placeholder="123" /></label><label>Bairro<input required name="customerNeighborhood" placeholder="Bairro" /></label><label>Cidade<input required name="customerCity" placeholder="Cidade" /></label><label>CEP<input required name="customerZipCode" placeholder="00000-000" /></label><label>Complemento<input name="customerComplement" placeholder="Casa, sala, bloco..." /></label></div></div>
      <div className="form-section"><div className="form-section-title"><span>3</span><div><h3>Endereço(s) da obra</h3><p>Local(is) onde os equipamentos serão deixados e recolhidos.</p></div></div><input type="hidden" name="workAddressCount" value={workAddressCount} />{Array.from({ length: workAddressCount }, (_, index) => <div className="work-address" key={index}><div className="work-address-heading"><strong>Obra {index + 1}</strong>{workAddressCount > 1 && <button type="button" className="remove-address" onClick={() => setWorkAddressCount((count) => count - 1)}>Remover</button>}</div><div className="form-grid"><label className="wide-field">Rua / Avenida<input required name={`workStreet-${index}`} placeholder="Nome da rua ou avenida" /></label><label>Número<input required name={`workNumber-${index}`} placeholder="123" /></label><label>Bairro<input required name={`workNeighborhood-${index}`} placeholder="Bairro" /></label><label>Cidade<input required name={`workCity-${index}`} placeholder="Cidade" /></label><label>CEP<input required name={`workZipCode-${index}`} placeholder="00000-000" /></label><label>Complemento<input name={`workComplement-${index}`} placeholder="Casa, sala, bloco..." /></label><label className="wide-field">Ponto de referência<input name={`workReference-${index}`} placeholder="Ex.: próximo ao portão azul" /></label><label className="wide-field">Localização enviada pelo WhatsApp<input type="url" name={`workLocation-${index}`} placeholder="Cole aqui o link do Google Maps recebido no WhatsApp" /><small className="field-help">Copie a localização enviada pelo cliente no WhatsApp e cole neste campo.</small></label></div></div>)}<button type="button" className="add-address" onClick={() => setWorkAddressCount((count) => count + 1)}>+ Adicionar outro endereço de obra</button></div>
      <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button">Salvar cliente</button></div>
    </form>}
    <div className="panel table-panel">{customers.length === 0 ? <div className="empty-state"><div className="empty-icon">♙</div><strong>Nenhum cliente cadastrado</strong><p>Comece cadastrando o primeiro cliente da Amigo Locações.</p><button className="text-button" onClick={() => setShowForm(true)}>Cadastrar primeiro cliente</button></div> : <div className="table-wrap"><table><thead><tr><th>CLIENTE</th><th>CPF/CNPJ</th><th>CONTATO</th><th>ENDEREÇO DA OBRA</th><th>MAPA</th></tr></thead><tbody>{customers.map((customer) => { const workAddress = customer.workAddresses?.[0]; return <tr key={customer.id}><td><strong>{customer.name}</strong></td><td>{customer.document}</td><td>{customer.phone || customer.email || "—"}</td><td>{workAddress ? `${workAddress.street}, ${workAddress.number} - ${workAddress.city}` : "—"}{customer.workAddresses && customer.workAddresses.length > 1 && <small className="address-count"> +{customer.workAddresses.length - 1}</small>}</td><td>{workAddress?.locationUrl ? <a className="map-link" href={workAddress.locationUrl} target="_blank" rel="noopener noreferrer">Abrir no Maps ↗</a> : <span className="no-map">Não informado</span>}</td></tr>; })}</tbody></table></div>}</div>
  </section>;
}

function EquipmentList({ equipment, setEquipment, onNotice }: { equipment: Equipment[]; setEquipment: (items: Equipment[]) => void; onNotice: (message: string) => void }) {
  function toggle(id: string) { setEquipment(equipment.map((item) => item.id === id ? { ...item, active: !item.active } : item)); }
  return <section><div className="section-heading"><div><p className="eyebrow">CATÁLOGO E PREÇOS</p><h1>Equipamentos</h1><p>Configure os equipamentos e as regras de cobrança da empresa.</p></div><button className="primary-button" onClick={() => onNotice("O cadastro de novos equipamentos será conectado ao Supabase na próxima etapa.")}><span>+</span> Novo equipamento</button></div><div className="equipment-grid">{equipment.map((item) => <article className={`equipment-card ${!item.active ? "inactive" : ""}`} key={item.id}><div className="equipment-top"><div className="equipment-symbol">▣</div><button className={`status-pill ${item.active ? "status-active" : "status-inactive"}`} onClick={() => toggle(item.id)}>{item.active ? "Ativo" : "Inativo"}</button></div><p className="equipment-category">{item.category}</p><h2>{item.name}</h2><p className="equipment-billing">Cobrança: <strong>{item.billing}</strong></p><div className="price-rule"><span>Regra de preço</span><strong>{item.rules}</strong></div></article>)}</div></section>;
}

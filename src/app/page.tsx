"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type View = "dashboard" | "clientes" | "equipamentos" | "orcamentos" | "locacoes" | "financeiro";

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

type QuoteItem = {
  id: string;
  equipmentId: string;
  quantity: number;
  days: number;
  unitPrice: number;
  total: number;
};

type Quote = {
  id: string;
  number: string;
  customerId: string;
  workAddressIndex: number;
  startDate: string;
  startTime: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: "Rascunho" | "Aguardando assinatura" | "Assinado" | "Recusado" | "Cancelado";
  createdAt: string;
};

type Contract = {
  id: string;
  number: string;
  quoteId: string;
  customerId: string;
  workAddressIndex: number;
  startDate: string;
  dueDate: string;
  items: QuoteItem[];
  total: number;
  status: "Ativo" | "Vencendo" | "Vencido" | "Renovado" | "Encerrado" | "Cancelado";
  renewals: Renewal[];
  createdAt: string;
};

type Renewal = {
  id: string;
  mode: "Alteração do período original" | "Novo ciclo de locação";
  date: string;
  additionalDays: number;
  additionalValue: number;
  newDueDate: string;
  user: string;
};

type Payment = {
  id: string;
  contractId: string;
  customerId: string;
  description: string;
  dueAmount: number;
  receivedAmount: number;
  dueDate: string;
  paymentDate: string;
  method: "PIX" | "Dinheiro" | "Transferência" | "Outros";
  notes: string;
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
  { id: "orcamentos", label: "Orçamentos", icon: "▤" },
  { id: "locacoes", label: "Locações", icon: "↗" },
  { id: "financeiro", label: "Financeiro", icon: "R$" },
];

function priceFor(equipment: Equipment, days: number) {
  if (equipment.id === "martelete-10") return 100 * days;
  if (equipment.id === "martelete-15") return 150 * days;
  if (equipment.id === "compactador") return 80 * days;
  if (equipment.id === "betoneira") return [100, 200, 300, 400][days <= 1 ? 0 : days <= 7 ? 1 : days <= 15 ? 2 : 3];
  if (equipment.id === "andaime") return [6, 9, 15][days <= 7 ? 0 : days <= 15 ? 1 : 2];
  return 0;
}

function money(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function addDays(date: string, days: number) {
  const result = new Date(`${date}T12:00:00`);
  result.setDate(result.getDate() + days);
  return result.toISOString().slice(0, 10);
}

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
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCustomers(readStorage<Customer[]>("amigo-customers", []));
      setEquipment(readStorage<Equipment[]>("amigo-equipment", initialEquipment));
      setQuotes(readStorage<Quote[]>("amigo-quotes", []));
      setContracts(readStorage<Contract[]>("amigo-contracts", []));
      setPayments(readStorage<Payment[]>("amigo-payments", []));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("amigo-customers", JSON.stringify(customers));
      window.localStorage.setItem("amigo-equipment", JSON.stringify(equipment));
      window.localStorage.setItem("amigo-quotes", JSON.stringify(quotes));
      window.localStorage.setItem("amigo-contracts", JSON.stringify(contracts));
      window.localStorage.setItem("amigo-payments", JSON.stringify(payments));
    }
  }, [customers, equipment, quotes, contracts, payments]);

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

  function saveQuote(quote: Quote) {
    setQuotes((current) => [quote, ...current]);
    setNotice(`Orçamento ${quote.number} salvo como rascunho.`);
  }

  function convertQuote(quote: Quote) {
    if (contracts.some((item) => item.quoteId === quote.id)) {
      setNotice("Este orçamento já foi convertido em locação.");
      return;
    }
    const contract: Contract = {
      id: crypto.randomUUID(),
      number: `CTR-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      quoteId: quote.id,
      customerId: quote.customerId,
      workAddressIndex: quote.workAddressIndex,
      startDate: quote.startDate,
      dueDate: addDays(quote.startDate, Math.max(...quote.items.map((item) => item.days))),
      items: quote.items,
      total: quote.total,
      status: "Ativo",
      renewals: [],
      createdAt: new Date().toISOString(),
    };
    setContracts((current) => [contract, ...current]);
    setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, status: "Assinado" } : item));
    setNotice(`Contrato ${contract.number} criado com sucesso.`);
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
            <span className="nav-icon">⌖</span>
            Recolhimentos
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
          {view === "dashboard" && <Dashboard customers={customers} activeEquipment={activeEquipment} contracts={contracts} payments={payments} navigate={navigate} onNotice={setNotice} />}
          {view === "clientes" && (
            <Customers
              customers={customers}
              showForm={showCustomerForm}
              setShowForm={setShowCustomerForm}
              onSubmit={saveCustomer}
            />
          )}
          {view === "equipamentos" && <EquipmentList equipment={equipment} setEquipment={setEquipment} onNotice={setNotice} />}
          {view === "orcamentos" && <Quotes customers={customers} equipment={equipment} quotes={quotes} onSave={saveQuote} onNotice={setNotice} onConvert={convertQuote} />}
          {view === "locacoes" && <Contracts customers={customers} equipment={equipment} contracts={contracts} setContracts={setContracts} onNotice={setNotice} />}
          {view === "financeiro" && <Finance customers={customers} contracts={contracts} payments={payments} setPayments={setPayments} onNotice={setNotice} />}
        </div>
      </main>
    </div>
  );
}

function pageTitle(view: View) {
  return view === "dashboard" ? "Visão geral" : view[0].toUpperCase() + view.slice(1);
}

function Dashboard({ customers, activeEquipment, contracts, payments, navigate, onNotice }: { customers: Customer[]; activeEquipment: number; contracts: Contract[]; payments: Payment[]; navigate: (view: View) => void; onNotice: (message: string) => void }) {
  const cards = [
    { label: "Clientes cadastrados", value: customers.length, icon: "♙", action: () => navigate("clientes"), tone: "purple" },
    { label: "Equipamentos ativos", value: activeEquipment, icon: "▣", action: () => navigate("equipamentos"), tone: "blue" },
    { label: "Locações ativas", value: contracts.filter((item) => item.status === "Ativo" || item.status === "Renovado").length, icon: "↗", action: () => navigate("locacoes"), tone: "green" },
    { label: "Pagamentos pendentes", value: payments.filter((item) => item.receivedAmount < item.dueAmount).length, icon: "R$", action: () => navigate("financeiro"), tone: "orange" },
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
    <div className="panel table-panel">{customers.length === 0 ? <div className="empty-state"><div className="empty-icon">♙</div><strong>Nenhum cliente cadastrado</strong><p>Comece cadastrando o primeiro cliente da Amigo Locações.</p><button className="text-button" onClick={() => setShowForm(true)}>Cadastrar primeiro cliente</button></div> : <div className="table-wrap"><table><thead><tr><th>CLIENTE</th><th>CPF/CNPJ</th><th>CONTATO</th><th>ENDEREÇO DA OBRA</th><th>MAPA</th></tr></thead><tbody>{customers.map((customer) => { const workAddress = customer.workAddresses?.[0]; return <tr key={customer.id}><td><strong>{customer.name}</strong></td><td>{customer.document}</td><td>{customer.phone || customer.email || "—"}</td><td>{workAddress ? `${workAddress.street}, ${workAddress.number} - ${workAddress.neighborhood}` : "—"}{customer.workAddresses && customer.workAddresses.length > 1 && <small className="address-count"> +{customer.workAddresses.length - 1}</small>}</td><td>{workAddress?.locationUrl ? <a className="map-link" href={workAddress.locationUrl} target="_blank" rel="noopener noreferrer">Abrir no Maps ↗</a> : <span className="no-map">Não informado</span>}</td></tr>; })}</tbody></table></div>}</div>
  </section>;
}

function Quotes({ customers, equipment, quotes, onSave, onNotice, onConvert }: { customers: Customer[]; equipment: Equipment[]; quotes: Quote[]; onSave: (quote: Quote) => void; onNotice: (message: string) => void; onConvert: (quote: Quote) => void }) {
  const [creating, setCreating] = useState(false);
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
  const [addressIndex, setAddressIndex] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("08:00");
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState<QuoteItem[]>([]);
  const availableEquipment = equipment.filter((item) => item.active);
  const customer = customers.find((item) => item.id === customerId);
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(0, subtotal - discount);

  function addItem() {
    const first = availableEquipment[0];
    if (!first) return;
    const unitPrice = priceFor(first, 1);
    setItems((current) => [...current, { id: crypto.randomUUID(), equipmentId: first.id, quantity: 1, days: 1, unitPrice, total: unitPrice }]);
  }

  function updateItem(id: string, field: "equipmentId" | "quantity" | "days", value: string) {
    setItems((current) => current.map((item) => {
      if (item.id !== id) return item;
      const equipmentId = field === "equipmentId" ? value : item.equipmentId;
      const quantity = field === "quantity" ? Math.max(1, Number(value)) : item.quantity;
      const days = field === "days" ? Math.max(1, Number(value)) : item.days;
      const selected = equipment.find((entry) => entry.id === equipmentId) ?? availableEquipment[0];
      const unitPrice = priceFor(selected, days);
      return { ...item, equipmentId, quantity, days, unitPrice, total: unitPrice * quantity };
    }));
  }

  function submitQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!customerId || !startDate || items.length === 0) {
      onNotice("Selecione o cliente, informe a data e adicione pelo menos um equipamento.");
      return;
    }
    const quote: Quote = {
      id: crypto.randomUUID(),
      number: `ORC-${crypto.randomUUID().slice(0, 6).toUpperCase()}`,
      customerId,
      workAddressIndex: addressIndex,
      startDate,
      startTime,
      items,
      subtotal,
      discount,
      total,
      status: "Rascunho",
      createdAt: new Date().toISOString(),
    };
    onSave(quote);
    setCreating(false);
    setItems([]);
    setDiscount(0);
  }

  function printQuote(quote: Quote) {
    const quoteCustomer = customers.find((item) => item.id === quote.customerId);
    const address = quoteCustomer?.workAddresses?.[quote.workAddressIndex];
    const rows = quote.items.map((item) => {
      const selected = equipment.find((entry) => entry.id === item.equipmentId);
      return `<tr><td>${item.quantity}</td><td>${selected?.name ?? "Equipamento"}</td><td>${item.days} dia(s)</td><td>${money(item.unitPrice)}</td><td>${money(item.total)}</td></tr>`;
    }).join("");
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      onNotice("Permita pop-ups no navegador para gerar o PDF.");
      return;
    }
    popup.document.write(`<html><head><title>${quote.number} - Amigo Locações</title><style>body{font-family:Arial;color:#17212b;padding:40px;line-height:1.4}h1{color:#6d4aff;margin-bottom:4px}h2{font-size:16px;border-bottom:1px solid #ddd;padding-bottom:8px;margin-top:28px}small{color:#667382}table{width:100%;border-collapse:collapse;margin-top:12px}th,td{text-align:left;border-bottom:1px solid #ddd;padding:10px;font-size:12px}th{font-size:10px;color:#667382}strong{font-size:20px}.terms{font-size:11px;margin-top:26px}.signature{display:flex;gap:100px;margin-top:70px}.signature div{border-top:1px solid #555;width:230px;padding-top:8px;font-size:11px}</style></head><body><h1>AMIGO LOCAÇÕES</h1><small>Orçamento ${quote.number} · ${new Date(quote.createdAt).toLocaleDateString("pt-BR")}</small><h2>Dados do cliente</h2><p><b>${quoteCustomer?.name ?? "Cliente"}</b><br>${quoteCustomer?.document ?? ""} · ${quoteCustomer?.phone ?? ""}<br>${quoteCustomer?.address ? `${quoteCustomer.address.street}, ${quoteCustomer.address.number} - ${quoteCustomer.address.neighborhood}, ${quoteCustomer.address.city}` : ""}</p><h2>Local da obra</h2><p>${address ? `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city} - CEP ${address.zipCode}` : "Endereço não informado"}<br>Início: ${new Date(`${quote.startDate}T${quote.startTime}`).toLocaleString("pt-BR")}</p><h2>Equipamentos</h2><table><thead><tr><th>Qtd.</th><th>Equipamento</th><th>Período</th><th>Valor unitário</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table><p style="text-align:right;margin-top:24px">Subtotal: ${money(quote.subtotal)}<br>Desconto: ${money(quote.discount)}<br><strong>Total: ${money(quote.total)}</strong></p><div class="terms"><b>Condições comerciais</b><p>TODA LOCAÇÃO DEVERÁ SER PAGA ANTECIPADAMENTE. Em caso de pagamento via Pix, enviar o comprovante.</p><p>OS EQUIPAMENTOS SERÃO RECOLHIDOS NO DIA POSTERIOR DO VENCIMENTO OU MEDIANTE A RENOVAÇÃO EM ATÉ 01 DIA ANTES DO CONTRATADO.</p></div><div class="signature"><div>Assinatura do locatário</div><div>AMIGO LOCAÇÕES - Locador</div></div></body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  return <section><div className="section-heading"><div><p className="eyebrow">VENDAS</p><h1>Orçamentos</h1><p>Monte propostas, calcule os valores e gere o documento para o cliente.</p></div><button className="primary-button" onClick={() => setCreating(true)}><span>+</span> Novo orçamento</button></div>
    {creating && <form className="form-card quote-form" onSubmit={submitQuote}><div className="form-heading"><div><h2>Novo orçamento</h2><p className="form-description">Preencha os dados da locação e confira o resumo antes de salvar.</p></div><button type="button" className="close-form" onClick={() => setCreating(false)}>×</button></div>
      <div className="form-grid"><label>Cliente<select required value={customerId} onChange={(event) => { setCustomerId(event.target.value); setAddressIndex(0); }}><option value="">Selecione um cliente</option>{customers.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></label><label>Endereço da obra<select value={addressIndex} onChange={(event) => setAddressIndex(Number(event.target.value))} disabled={!customer?.workAddresses?.length}>{customer?.workAddresses?.map((address, index) => <option value={index} key={`${address.street}-${index}`}>{address.street}, {address.number} - {address.neighborhood}</option>) ?? <option>Cadastre uma obra no cliente</option>}</select></label><label>Data de início<input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Horário de início<input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label></div>
      <div className="quote-items-heading"><div><h3>Equipamentos</h3><p>Adicione um ou mais itens ao orçamento.</p></div><button type="button" className="add-address" onClick={addItem}>+ Adicionar equipamento</button></div>
      {items.length === 0 ? <div className="quote-empty">Nenhum equipamento adicionado. Clique em “Adicionar equipamento”.</div> : <div className="quote-items">{items.map((item) => <div className="quote-item" key={item.id}><label>Equipamento<select value={item.equipmentId} onChange={(event) => updateItem(item.id, "equipmentId", event.target.value)}>{availableEquipment.map((entry) => <option value={entry.id} key={entry.id}>{entry.name}</option>)}</select></label><label>Quantidade<input type="number" min="1" value={item.quantity} onChange={(event) => updateItem(item.id, "quantity", event.target.value)} /></label><label>Dias<input type="number" min="1" value={item.days} onChange={(event) => updateItem(item.id, "days", event.target.value)} /></label><div className="quote-item-total"><span>Total</span><strong>{money(item.total)}</strong></div><button type="button" className="remove-address" onClick={() => setItems(items.filter((entry) => entry.id !== item.id))}>Remover</button></div>)}</div>}
      <div className="quote-summary"><label>Desconto<input type="number" min="0" step="0.01" value={discount} onChange={(event) => setDiscount(Number(event.target.value))} /></label><div><span>Subtotal</span><strong>{money(subtotal)}</strong></div><div><span>Total geral</span><strong className="quote-grand-total">{money(total)}</strong></div></div>
      <div className="form-actions"><button type="button" className="secondary-button" onClick={() => setCreating(false)}>Cancelar</button><button className="primary-button">Salvar orçamento</button></div>
    </form>}
    {customers.length === 0 && !creating && <div className="panel"><div className="empty-state"><div className="empty-icon">▤</div><strong>Cadastre um cliente antes de criar um orçamento</strong><p>O orçamento precisa de um cliente e de um endereço de obra.</p></div></div>}
    {customers.length > 0 && quotes.length === 0 && !creating && <div className="panel"><div className="empty-state"><div className="empty-icon">▤</div><strong>Nenhum orçamento criado</strong><p>Crie seu primeiro orçamento para começar a acompanhar as propostas.</p></div></div>}
    {quotes.length > 0 && <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>NÚMERO</th><th>CLIENTE</th><th>INÍCIO</th><th>TOTAL</th><th>STATUS</th><th>AÇÕES</th></tr></thead><tbody>{quotes.map((quote) => <tr key={quote.id}><td><strong>{quote.number}</strong></td><td>{customers.find((item) => item.id === quote.customerId)?.name ?? "Cliente"}</td><td>{new Date(`${quote.startDate}T${quote.startTime}`).toLocaleString("pt-BR")}</td><td><strong>{money(quote.total)}</strong></td><td><span className="quote-status">{quote.status}</span></td><td><button className="text-button" onClick={() => printQuote(quote)}>PDF</button>{" "}{quote.status !== "Assinado" && <button className="text-button" onClick={() => onConvert({ ...quote, status: "Assinado" })}>Assinar / criar locação</button>}{quote.status === "Assinado" && <span className="no-map">Locação criada</span>}</td></tr>)}</tbody></table></div></div>}
  </section>;
}

function Contracts({ customers, equipment, contracts, setContracts, onNotice }: { customers: Customer[]; equipment: Equipment[]; contracts: Contract[]; setContracts: (items: Contract[]) => void; onNotice: (message: string) => void }) {
  const [renewing, setRenewing] = useState<string | null>(null);
  const [mode, setMode] = useState<Renewal["mode"]>("Alteração do período original");
  const [days, setDays] = useState(1);

  function renew(contract: Contract) {
    const itemValue = contract.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const additionalValue = mode === "Novo ciclo de locação" ? itemValue : itemValue * (days / Math.max(1, contract.items.reduce((sum, item) => sum + item.days, 0)));
    const renewal: Renewal = { id: crypto.randomUUID(), mode, date: new Date().toISOString(), additionalDays: days, additionalValue, newDueDate: addDays(contract.dueDate, days), user: "Administrador" };
    setContracts(contracts.map((item) => item.id === contract.id ? { ...item, dueDate: renewal.newDueDate, total: item.total + additionalValue, status: "Renovado", renewals: [...item.renewals, renewal] } : item));
    setRenewing(null);
    onNotice(`Renovação registrada. Valor adicional: ${money(additionalValue)}.`);
  }

  return <section><div className="section-heading"><div><p className="eyebrow">OPERAÇÃO</p><h1>Locações</h1><p>Contratos ativos, vencimentos e histórico de renovações.</p></div></div>{contracts.length === 0 ? <div className="panel"><div className="empty-state"><div className="empty-icon">↗</div><strong>Nenhuma locação criada</strong><p>Assine um orçamento para convertê-lo em contrato.</p></div></div> : <div className="contract-grid">{contracts.map((contract) => { const customer = customers.find((item) => item.id === contract.customerId); return <article className="contract-card" key={contract.id}><div className="contract-header"><div><p className="eyebrow">{contract.number}</p><h2>{customer?.name ?? "Cliente"}</h2></div><span className="quote-status contract-status">{contract.status}</span></div><div className="contract-details"><span>Início<strong>{new Date(`${contract.startDate}T12:00:00`).toLocaleDateString("pt-BR")}</strong></span><span>Devolução<strong>{new Date(`${contract.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}</strong></span><span>Valor<strong>{money(contract.total)}</strong></span></div><p className="contract-equipment">{contract.items.map((item) => `${item.quantity}x ${equipment.find((entry) => entry.id === item.equipmentId)?.name ?? "Equipamento"}`).join(" · ")}</p>{contract.renewals.length > 0 && <p className="renewal-history">{contract.renewals.length} renovação(ões) registrada(s)</p>}{renewing === contract.id ? <div className="renew-form"><label>Modalidade<select value={mode} onChange={(event) => setMode(event.target.value as Renewal["mode"])}><option>Alteração do período original</option><option>Novo ciclo de locação</option></select></label><label>Dias adicionais<input type="number" min="1" value={days} onChange={(event) => setDays(Math.max(1, Number(event.target.value)))} /></label><div className="form-actions"><button className="secondary-button" onClick={() => setRenewing(null)}>Cancelar</button><button className="primary-button" onClick={() => renew(contract)}>Confirmar renovação</button></div></div> : <button className="secondary-button" onClick={() => setRenewing(contract.id)}>Renovar locação</button>}</article>; })}</div>}</section>;
}

function Finance({ customers, contracts, payments, setPayments, onNotice }: { customers: Customer[]; contracts: Contract[]; payments: Payment[]; setPayments: (items: Payment[]) => void; onNotice: (message: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const received = payments.reduce((sum, item) => sum + item.receivedAmount, 0);
  const pending = payments.reduce((sum, item) => sum + Math.max(0, item.dueAmount - item.receivedAmount), 0);

  function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const contract = contracts.find((item) => item.id === String(data.get("contractId")));
    if (!contract) { onNotice("Selecione uma locação válida."); return; }
    const payment: Payment = { id: crypto.randomUUID(), contractId: contract.id, customerId: contract.customerId, description: String(data.get("description") ?? "Locação"), dueAmount: Number(data.get("dueAmount") ?? 0), receivedAmount: Number(data.get("receivedAmount") ?? 0), dueDate: String(data.get("dueDate") ?? ""), paymentDate: String(data.get("paymentDate") ?? ""), method: String(data.get("method") ?? "PIX") as Payment["method"], notes: String(data.get("notes") ?? "") };
    setPayments([payment, ...payments]);
    setShowForm(false);
    onNotice("Lançamento financeiro salvo.");
    event.currentTarget.reset();
  }

  return <section><div className="section-heading"><div><p className="eyebrow">CONTROLE FINANCEIRO</p><h1>Financeiro</h1><p>Registre valores devidos, recebimentos e pagamentos parciais.</p></div><button className="primary-button" onClick={() => setShowForm(!showForm)}><span>+</span> Novo lançamento</button></div><div className="finance-metrics"><div className="finance-metric"><span>Total recebido</span><strong>{money(received)}</strong></div><div className="finance-metric"><span>Total pendente</span><strong>{money(pending)}</strong></div><div className="finance-metric"><span>Lançamentos</span><strong>{payments.length}</strong></div></div>{showForm && <form className="form-card" onSubmit={savePayment}><div className="form-heading"><h2>Novo lançamento</h2><button type="button" className="close-form" onClick={() => setShowForm(false)}>×</button></div><div className="form-grid"><label>Locação<select required name="contractId"><option value="">Selecione uma locação</option>{contracts.map((contract) => <option value={contract.id} key={contract.id}>{contract.number} - {customers.find((item) => item.id === contract.customerId)?.name}</option>)}</select></label><label>Descrição<input required name="description" defaultValue="Pagamento da locação" /></label><label>Valor devido<input required name="dueAmount" type="number" min="0" step="0.01" /></label><label>Valor recebido<input required name="receivedAmount" type="number" min="0" step="0.01" defaultValue="0" /></label><label>Vencimento<input required name="dueDate" type="date" /></label><label>Data do pagamento<input name="paymentDate" type="date" /></label><label>Forma de pagamento<select name="method"><option>PIX</option><option>Dinheiro</option><option>Transferência</option><option>Outros</option></select></label><label>Observações<input name="notes" /></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button">Salvar lançamento</button></div></form>}{payments.length === 0 ? <div className="panel"><div className="empty-state"><div className="empty-icon soft">R$</div><strong>Nenhum lançamento financeiro</strong><p>Registre o primeiro pagamento de uma locação.</p></div></div> : <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>CLIENTE</th><th>DESCRIÇÃO</th><th>DEVIDO</th><th>RECEBIDO</th><th>STATUS</th></tr></thead><tbody>{payments.map((payment) => { const customer = customers.find((item) => item.id === payment.customerId); const status = payment.receivedAmount >= payment.dueAmount ? "Pago" : payment.receivedAmount > 0 ? "Pago parcialmente" : new Date(payment.dueDate) < new Date() ? "Atrasado" : "Pendente"; return <tr key={payment.id}><td><strong>{customer?.name ?? "Cliente"}</strong></td><td>{payment.description}</td><td>{money(payment.dueAmount)}</td><td>{money(payment.receivedAmount)}</td><td><span className={`quote-status ${status === "Pago" ? "paid-status" : ""}`}>{status}</span></td></tr>; })}</tbody></table></div></div>}</section>;
}

function EquipmentList({ equipment, setEquipment, onNotice }: { equipment: Equipment[]; setEquipment: (items: Equipment[]) => void; onNotice: (message: string) => void }) {
  function toggle(id: string) { setEquipment(equipment.map((item) => item.id === id ? { ...item, active: !item.active } : item)); }
  return <section><div className="section-heading"><div><p className="eyebrow">CATÁLOGO E PREÇOS</p><h1>Equipamentos</h1><p>Configure os equipamentos e as regras de cobrança da empresa.</p></div><button className="primary-button" onClick={() => onNotice("O cadastro de novos equipamentos será conectado ao Supabase na próxima etapa.")}><span>+</span> Novo equipamento</button></div><div className="equipment-grid">{equipment.map((item) => <article className={`equipment-card ${!item.active ? "inactive" : ""}`} key={item.id}><div className="equipment-top"><div className="equipment-symbol">▣</div><button className={`status-pill ${item.active ? "status-active" : "status-inactive"}`} onClick={() => toggle(item.id)}>{item.active ? "Ativo" : "Inativo"}</button></div><p className="equipment-category">{item.category}</p><h2>{item.name}</h2><p className="equipment-billing">Cobrança: <strong>{item.billing}</strong></p><div className="price-rule"><span>Regra de preço</span><strong>{item.rules}</strong></div></article>)}</div></section>;
}

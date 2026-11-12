"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type View = "dashboard" | "clientes" | "equipamentos" | "orcamentos" | "locacoes" | "financeiro" | "recolhimentos";

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
  billingMode?: string;
  active: boolean;
  rules: string;
  pricing?: PriceRule[];
};

type PriceRule = {
  minDays: number;
  maxDays?: number;
  amount: number;
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

type CollectionStatus = "Pendente" | "Realizado" | "Renovação solicitada" | "Cliente não encontrado";

type CollectionTask = {
  id: string;
  contractId: string;
  status: CollectionStatus;
  updatedAt?: string;
};

const initialEquipment: Equipment[] = [
  {
    id: "martelete-10",
    name: "Martelete 10 kg",
    category: "Martelete",
    billing: "Diária",
    billingMode: "daily",
    pricing: [{ minDays: 1, amount: 100 }],
    active: true,
    rules: "R$ 100,00 por dia",
  },
  {
    id: "martelete-15",
    name: "Martelete 15 kg",
    category: "Martelete",
    billing: "Diária",
    billingMode: "daily",
    pricing: [{ minDays: 1, amount: 150 }],
    active: true,
    rules: "R$ 150,00 por dia",
  },
  {
    id: "compactador",
    name: "Compactador / Vibrador",
    category: "Compactação",
    billing: "Diária",
    billingMode: "daily",
    pricing: [{ minDays: 1, amount: 80 }],
    active: true,
    rules: "R$ 80,00 por dia",
  },
  {
    id: "betoneira",
    name: "Betoneira",
    category: "Mistura",
    billing: "Por período",
    billingMode: "period",
    pricing: [{ minDays: 1, maxDays: 1, amount: 100 }, { minDays: 2, maxDays: 7, amount: 200 }, { minDays: 8, maxDays: 15, amount: 300 }, { minDays: 16, amount: 400 }],
    active: true,
    rules: "1d: R$ 100,00 · 2–7d: R$ 200,00 · 8–15d: R$ 300,00",
  },
  {
    id: "andaime",
    name: "Andaime",
    category: "Acesso",
    billing: "Por período",
    billingMode: "period",
    pricing: [{ minDays: 1, maxDays: 7, amount: 6 }, { minDays: 8, maxDays: 15, amount: 9 }, { minDays: 16, amount: 15 }],
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
  { id: "recolhimentos", label: "Recolhimentos", icon: "⌖" },
];

function priceFor(equipment: Equipment, days: number) {
  if (equipment.pricing?.length) {
    const rule = equipment.pricing.find((item) => days >= item.minDays && (item.maxDays === undefined || days <= item.maxDays));
    if (rule) return equipment.billingMode === "daily" ? rule.amount * days : rule.amount;
  }
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

function localDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

function customerFromRemoteRow(row: { id: string; name: string; document: string; phone: string; email: string; customer_address: Address }, addresses: { address: Address }[]): Customer {
  return {
    id: row.id,
    name: row.name,
    document: row.document,
    phone: row.phone,
    email: row.email,
    city: row.customer_address?.city ?? "",
    address: row.customer_address,
    workAddresses: addresses.map((item) => item.address),
  };
}

function equipmentFromRemoteRow(row: { id: string; name: string; category: string; billing_unit: string; billing_mode: string; active: boolean; equipment_price_rules: { min_days: number; max_days: number | null; amount: number }[] }): Equipment {
  const pricing = row.equipment_price_rules.map((rule) => ({
    minDays: rule.min_days,
    ...(rule.max_days === null ? {} : { maxDays: rule.max_days }),
    amount: Number(rule.amount),
  }));
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    billing: row.billing_unit,
    billingMode: row.billing_mode === "period" || row.billing_unit.toLowerCase().includes("período") ? "period" : "daily",
    active: row.active,
    rules: pricing.map((rule) => `${rule.minDays}${rule.maxDays ? `-${rule.maxDays}` : "+"}d: ${money(rule.amount)}`).join(" · "),
    pricing,
  };
}

function quoteFromRemoteRow(row: { id: string; number: string; customer_id: string; work_address_id: string | null; start_date: string; start_time: string; subtotal: number; discount: number; total: number; status: Quote["status"]; created_at: string; quote_items: { id: string; equipment_id: string; quantity: number; days: number; unit_price: number; total: number }[] }, addressIndex: number): Quote {
  return {
    id: row.id,
    number: row.number,
    customerId: row.customer_id,
    workAddressIndex: addressIndex,
    startDate: row.start_date,
    startTime: row.start_time.slice(0, 5),
    items: row.quote_items.map((item) => ({
      id: item.id,
      equipmentId: item.equipment_id,
      quantity: item.quantity,
      days: item.days,
      unitPrice: Number(item.unit_price),
      total: Number(item.total),
    })),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    total: Number(row.total),
    status: row.status,
    createdAt: row.created_at,
  };
}

function contractFromRemoteRow(row: { id: string; number: string; quote_id: string; customer_id: string; work_address_id: string | null; start_date: string; due_date: string; total: number; status: Contract["status"]; created_at: string; contract_items: { id: string; equipment_id: string; quantity: number; days: number; unit_price: number; total: number }[]; contract_renewals: { id: string; mode: Renewal["mode"]; date: string; additional_days: number; additional_value: number; new_due_date: string }[] }, addressIndex: number): Contract {
  return {
    id: row.id,
    number: row.number,
    quoteId: row.quote_id,
    customerId: row.customer_id,
    workAddressIndex: addressIndex,
    startDate: row.start_date,
    dueDate: row.due_date,
    items: row.contract_items.map((item) => ({
      id: item.id,
      equipmentId: item.equipment_id,
      quantity: item.quantity,
      days: item.days,
      unitPrice: Number(item.unit_price),
      total: Number(item.total),
    })),
    total: Number(row.total),
    status: row.status,
    renewals: row.contract_renewals.map((renewal) => ({
      id: renewal.id,
      mode: renewal.mode,
      date: renewal.date,
      additionalDays: renewal.additional_days,
      additionalValue: Number(renewal.additional_value),
      newDueDate: renewal.new_due_date,
      user: "Administrador",
    })),
    createdAt: row.created_at,
  };
}

function paymentFromRemoteRow(row: { id: string; contract_id: string; customer_id: string; description: string; due_amount: number; received_amount: number; due_date: string; payment_date: string; method: Payment["method"]; notes: string }): Payment {
  return {
    id: row.id,
    contractId: row.contract_id,
    customerId: row.customer_id,
    description: row.description,
    dueAmount: Number(row.due_amount),
    receivedAmount: Number(row.received_amount),
    dueDate: row.due_date,
    paymentDate: row.payment_date,
    method: row.method,
    notes: row.notes,
  };
}

function collectionTaskFromRemoteRow(row: { id: string; contract_id: string; status: CollectionStatus; updated_at: string }): CollectionTask {
  return {
    id: row.id,
    contractId: row.contract_id,
    status: row.status,
    updatedAt: row.updated_at,
  };
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>(initialEquipment);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [collectionTasks, setCollectionTasks] = useState<CollectionTask[]>([]);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!supabase) {
      const timer = window.setTimeout(() => setAuthLoading(false), 0);
      return () => window.clearTimeout(timer);
    }
    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(error.message);
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase;
    let active = true;
    async function loadRemoteCustomers() {
      const { data, error } = await client
        .from("customers")
        .select("id,name,document,phone,email,customer_address,customer_addresses(address)")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setNotice(`Supabase indisponível para clientes. Continuando no modo local: ${error.message}`);
        return;
      }
      const remoteCustomers = (data ?? []).map((row) => customerFromRemoteRow(row, row.customer_addresses ?? []));
      setCustomers(remoteCustomers);
    }
    void loadRemoteCustomers();
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase;
    let active = true;
    async function loadRemoteContracts() {
      const { data: contractRows, error: contractError } = await client
        .from("contracts")
        .select("id,number,quote_id,customer_id,work_address_id,start_date,due_date,total,status,created_at,contract_items(id,equipment_id,quantity,days,unit_price,total),contract_renewals(id,mode,date,additional_days,additional_value,new_due_date)")
        .order("created_at", { ascending: false });
      const { data: paymentRows, error: paymentError } = await client
        .from("payments")
        .select("id,contract_id,customer_id,description,due_amount,received_amount,due_date,payment_date,method,notes")
        .order("created_at", { ascending: false });
      const { data: taskRows, error: taskError } = await client
        .from("collection_tasks")
        .select("id,contract_id,status,updated_at")
        .order("updated_at", { ascending: false });
      if (!active) return;
      if (contractError || paymentError || taskError) {
        setNotice(`Supabase indisponível para operação: ${contractError?.message ?? paymentError?.message ?? taskError?.message}`);
        return;
      }
      const customerIds = [...new Set((contractRows ?? []).map((row) => row.customer_id))];
      const { data: addresses, error: addressError } = customerIds.length
        ? await client.from("customer_addresses").select("id,customer_id").in("customer_id", customerIds).order("created_at", { ascending: true })
        : { data: [], error: null };
      if (!active) return;
      if (addressError) {
        setNotice(`Não foi possível carregar os endereços das locações: ${addressError.message}`);
        return;
      }
      setContracts((contractRows ?? []).map((row) => {
        const customerAddresses = (addresses ?? []).filter((address) => address.customer_id === row.customer_id);
        const addressIndex = customerAddresses.findIndex((address) => address.id === row.work_address_id);
        return contractFromRemoteRow(row, Math.max(0, addressIndex));
      }));
      setPayments((paymentRows ?? []).map((row) => paymentFromRemoteRow(row)));
      setCollectionTasks((taskRows ?? []).map((row) => collectionTaskFromRemoteRow(row)));
    }
    void loadRemoteContracts();
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase;
    let active = true;
    async function loadRemoteQuotes() {
      const { data, error } = await client
        .from("quotes")
        .select("id,number,customer_id,work_address_id,start_date,start_time,subtotal,discount,total,status,created_at,quote_items(id,equipment_id,quantity,days,unit_price,total)")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setNotice(`Supabase indisponível para orçamentos. Continuando no modo local: ${error.message}`);
        return;
      }
      const customerIds = [...new Set((data ?? []).map((row) => row.customer_id))];
      const { data: addresses, error: addressError } = customerIds.length
        ? await client.from("customer_addresses").select("id,customer_id").in("customer_id", customerIds).order("created_at", { ascending: true })
        : { data: [], error: null };
      if (!active) return;
      if (addressError) {
        setNotice(`Não foi possível carregar os endereços dos orçamentos: ${addressError.message}`);
        return;
      }
      const remoteQuotes = (data ?? []).map((row) => {
        const customerAddresses = (addresses ?? []).filter((address) => address.customer_id === row.customer_id);
        const addressIndex = customerAddresses.findIndex((address) => address.id === row.work_address_id);
        return quoteFromRemoteRow(row, Math.max(0, addressIndex));
      });
      setQuotes(remoteQuotes);
    }
    void loadRemoteQuotes();
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    if (!supabase || !session) return;
    const client = supabase;
    let active = true;
    async function loadRemoteEquipment() {
      const { data, error } = await client
        .from("equipment")
        .select("id,name,category,billing_unit,billing_mode,active,equipment_price_rules(min_days,max_days,amount)")
        .order("created_at", { ascending: true });
      if (!active) return;
      if (error) {
        setNotice(`Supabase indisponível para equipamentos. Continuando no modo local: ${error.message}`);
        return;
      }
      if (data?.length) {
        setEquipment(data.map((row) => equipmentFromRemoteRow(row)));
        return;
      }

      const { data: savedEquipment, error: insertError } = await client
        .from("equipment")
        .insert(initialEquipment.map((item) => ({
          name: item.name,
          category: item.category,
          billing_unit: item.billing,
          billing_mode: item.billingMode ?? "daily",
          active: item.active,
        })))
        .select("id,name,category,billing_unit,billing_mode,active");
      if (insertError || !savedEquipment || savedEquipment.length !== initialEquipment.length) {
        setNotice(`Não foi possível cadastrar o catálogo inicial no Supabase: ${insertError?.message ?? "resposta incompleta"}`);
        return;
      }

      const rules = savedEquipment.flatMap((saved, index) =>
        (initialEquipment[index].pricing ?? []).map((rule) => ({
          equipment_id: saved.id,
          min_days: rule.minDays,
          max_days: rule.maxDays ?? null,
          amount: rule.amount,
        })),
      );
      const { error: rulesError } = await client.from("equipment_price_rules").insert(rules);
      if (rulesError) {
        await client.from("equipment").delete().in("id", savedEquipment.map((item) => item.id));
        setNotice(`Não foi possível cadastrar as regras de preço iniciais: ${rulesError.message}`);
        return;
      }

      const seeded = savedEquipment.map((saved, index) => ({
        ...saved,
        equipment_price_rules: initialEquipment[index].pricing?.map((rule) => ({
          min_days: rule.minDays,
          max_days: rule.maxDays ?? null,
          amount: rule.amount,
        })) ?? [],
      }));
      setEquipment(seeded.map((item) => equipmentFromRemoteRow(item)));
      setNotice("Catálogo inicial cadastrado no Supabase.");
    }
    void loadRemoteEquipment();
    return () => {
      active = false;
    };
  }, [session]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCustomers(readStorage<Customer[]>("amigo-customers", []));
      setEquipment(readStorage<Equipment[]>("amigo-equipment", initialEquipment));
      setQuotes(readStorage<Quote[]>("amigo-quotes", []));
      setContracts(readStorage<Contract[]>("amigo-contracts", []));
      setPayments(readStorage<Payment[]>("amigo-payments", []));
      setCollectionTasks(readStorage<CollectionTask[]>("amigo-collection-tasks", []));
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
      window.localStorage.setItem("amigo-collection-tasks", JSON.stringify(collectionTasks));
    }
  }, [customers, equipment, quotes, contracts, payments, collectionTasks]);

  const activeEquipment = useMemo(
    () => equipment.filter((item) => item.active).length,
    [equipment],
  );

  function signOut() {
    if (supabase) void supabase.auth.signOut();
  }

  if (authLoading) return <div className="auth-page"><div className="auth-card"><div className="brand-mark">A</div><h1>Amigo Locações</h1><p>Verificando seu acesso...</p></div></div>;
  if (supabase && !session) return <Login authError={authError} onError={setAuthError} />;

  function navigate(nextView: View) {
    setView(nextView);
    setMenuOpen(false);
    setNotice("");
  }

  async function saveCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
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
    if (supabase && session) {
      const { data: savedCustomer, error } = await supabase
        .from("customers")
        .insert({
          name: customer.name,
          document: customer.document,
          phone: customer.phone,
          email: customer.email,
          customer_address: customer.address,
        })
        .select("id,name,document,phone,email,customer_address")
        .single();
      if (error || !savedCustomer) {
        setCustomers((current) => [...current, customer]);
        setNotice(`Não foi possível salvar no Supabase. Cliente mantido localmente: ${error?.message ?? "resposta vazia"}`);
        setShowCustomerForm(false);
        form.reset();
        return;
      }
      const { error: addressError } = await supabase.from("customer_addresses").insert(
        (customer.workAddresses ?? []).map((address) => ({ customer_id: savedCustomer.id, label: "Obra", address })),
      );
      if (addressError) {
        await supabase.from("customers").delete().eq("id", savedCustomer.id);
        setNotice(`Não foi possível salvar os endereços da obra: ${addressError.message}`);
        return;
      }
      setCustomers((current) => [customerFromRemoteRow(savedCustomer, (customer.workAddresses ?? []).map((address) => ({ address }))), ...current]);
    } else {
      setCustomers((current) => [...current, customer]);
    }
    setShowCustomerForm(false);
    setNotice("Cliente cadastrado com sucesso.");
    form.reset();
  }

  async function saveQuote(quote: Quote) {
    if (supabase && session) {
      const customerAddresses = await supabase
        .from("customer_addresses")
        .select("id")
        .eq("customer_id", quote.customerId)
        .order("created_at", { ascending: true });
      const workAddressId = customerAddresses.data?.[quote.workAddressIndex]?.id ?? null;
      if (customerAddresses.error || !workAddressId) {
        setQuotes((current) => [quote, ...current]);
        setNotice(`Não foi possível vincular o endereço da obra no Supabase. Orçamento mantido localmente: ${customerAddresses.error?.message ?? "endereço não encontrado"}`);
        return;
      }
      const { data: savedQuote, error } = await supabase.from("quotes").insert({
        customer_id: quote.customerId,
        work_address_id: workAddressId,
        number: quote.number,
        start_date: quote.startDate,
        start_time: quote.startTime,
        subtotal: quote.subtotal,
        discount: quote.discount,
        total: quote.total,
        status: quote.status,
      }).select("id,number,customer_id,work_address_id,start_date,start_time,subtotal,discount,total,status,created_at").single();
      if (error || !savedQuote) {
        setQuotes((current) => [quote, ...current]);
        setNotice(`Não foi possível salvar o orçamento no Supabase. Mantido localmente: ${error?.message ?? "resposta vazia"}`);
        return;
      }
      const { data: savedItems, error: itemError } = await supabase.from("quote_items").insert(
        quote.items.map((item) => ({
          quote_id: savedQuote.id,
          equipment_id: item.equipmentId,
          quantity: item.quantity,
          days: item.days,
          unit_price: item.unitPrice,
          total: item.total,
        })),
      ).select("id,equipment_id,quantity,days,unit_price,total");
      if (itemError || !savedItems) {
        await supabase.from("quotes").delete().eq("id", savedQuote.id);
        setQuotes((current) => [quote, ...current]);
        setNotice(`Não foi possível salvar os itens do orçamento: ${itemError?.message ?? "resposta vazia"}`);
        return;
      }
      setQuotes((current) => [{ ...quote, id: savedQuote.id, createdAt: savedQuote.created_at, items: savedItems.map((item) => ({ id: item.id, equipmentId: item.equipment_id, quantity: item.quantity, days: item.days, unitPrice: Number(item.unit_price), total: Number(item.total) })) }, ...current]);
      setNotice(`Orçamento ${quote.number} salvo no Supabase.`);
      return;
    }
    setQuotes((current) => [quote, ...current]);
    setNotice(`Orçamento ${quote.number} salvo como rascunho.`);
  }

  async function convertQuote(quote: Quote) {
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
    if (supabase && session) {
      const addresses = await supabase.from("customer_addresses").select("id").eq("customer_id", quote.customerId).order("created_at", { ascending: true });
      const workAddressId = addresses.data?.[quote.workAddressIndex]?.id ?? null;
      if (addresses.error || !workAddressId) {
        setNotice(`Não foi possível vincular o endereço da obra à locação: ${addresses.error?.message ?? "endereço não encontrado"}`);
        return;
      }
      const { data: savedContract, error } = await supabase.from("contracts").insert({
        quote_id: quote.id,
        customer_id: quote.customerId,
        work_address_id: workAddressId,
        number: contract.number,
        start_date: contract.startDate,
        due_date: contract.dueDate,
        total: contract.total,
        status: contract.status,
      }).select("id,created_at").single();
      if (error || !savedContract) {
        setNotice(`Não foi possível salvar a locação no Supabase: ${error?.message ?? "resposta vazia"}`);
        return;
      }
      const { data: savedItems, error: itemError } = await supabase.from("contract_items").insert(
        quote.items.map((item) => ({ contract_id: savedContract.id, equipment_id: item.equipmentId, quantity: item.quantity, days: item.days, unit_price: item.unitPrice, total: item.total })),
      ).select("id,equipment_id,quantity,days,unit_price,total");
      if (itemError || !savedItems) {
        await supabase.from("contracts").delete().eq("id", savedContract.id);
        setNotice(`Não foi possível salvar os itens da locação: ${itemError?.message ?? "resposta vazia"}`);
        return;
      }
      const { data: savedPayment, error: paymentError } = await supabase.from("payments").insert({
        contract_id: savedContract.id,
        customer_id: contract.customerId,
        description: `Cobrança inicial ${contract.number}`,
        due_amount: quote.total,
        received_amount: 0,
        due_date: contract.dueDate,
        payment_date: localDate(),
        method: "PIX",
        notes: "Gerado automaticamente ao converter o orçamento em locação.",
      }).select("id,contract_id,customer_id,description,due_amount,received_amount,due_date,payment_date,method,notes").single();
      if (paymentError || !savedPayment) {
        await supabase.from("contracts").delete().eq("id", savedContract.id);
        setNotice(`Não foi possível criar a cobrança inicial: ${paymentError?.message ?? "resposta vazia"}`);
        return;
      }
      await supabase.from("quotes").update({ status: "Assinado" }).eq("id", quote.id);
      setContracts((current) => [{ ...contract, id: savedContract.id, createdAt: savedContract.created_at, items: savedItems.map((item) => ({ id: item.id, equipmentId: item.equipment_id, quantity: item.quantity, days: item.days, unitPrice: Number(item.unit_price), total: Number(item.total) })) }, ...current]);
      setPayments((current) => [paymentFromRemoteRow(savedPayment), ...current]);
      setQuotes((current) => current.map((item) => item.id === quote.id ? { ...item, status: "Assinado" } : item));
      setNotice(`Contrato ${contract.number} criado e salvo no Supabase.`);
      return;
    }
    const openingPayment: Payment = {
      id: crypto.randomUUID(),
      contractId: contract.id,
      customerId: contract.customerId,
      description: `Cobrança inicial ${contract.number}`,
      dueAmount: quote.total,
      receivedAmount: 0,
      dueDate: contract.dueDate,
      paymentDate: localDate(),
      method: "PIX",
      notes: "Gerado automaticamente ao converter o orçamento em locação.",
    };
    setContracts((current) => [contract, ...current]);
    setPayments((current) => [openingPayment, ...current]);
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
            <div className="user-info"><strong>{session?.user.email ?? "Modo local"}</strong><span>Administrador</span></div>
            {supabase && session && <button className="logout-button" onClick={signOut}>Sair</button>}
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
          {view === "equipamentos" && <EquipmentList equipment={equipment} setEquipment={setEquipment} session={session} onNotice={setNotice} />}
          {view === "orcamentos" && <Quotes customers={customers} equipment={equipment} quotes={quotes} onSave={saveQuote} onNotice={setNotice} onConvert={convertQuote} />}
          {view === "locacoes" && <Contracts customers={customers} equipment={equipment} contracts={contracts} setContracts={setContracts} payments={payments} setPayments={setPayments} session={session} onNotice={setNotice} />}
          {view === "financeiro" && <Finance customers={customers} contracts={contracts} payments={payments} setPayments={setPayments} session={session} onNotice={setNotice} />}
          {view === "recolhimentos" && <Collections customers={customers} equipment={equipment} contracts={contracts} payments={payments} tasks={collectionTasks} setTasks={setCollectionTasks} session={session} onNotice={setNotice} />}
        </div>
      </main>
    </div>
  );
}

function Login({ authError, onError }: { authError: string; onError: (message: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const client = supabase;
    if (!client) return;
    setLoading(true);
    onError("");
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) onError("E-mail ou senha inválidos.");
    setLoading(false);
  }

  return <main className="auth-page"><form className="auth-card" onSubmit={submit}><div className="brand-mark">A</div><h1>Amigo Locações</h1><p className="auth-subtitle">Entre para acessar o sistema de gestão.</p><label>E-mail<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu@email.com" /></label><label>Senha<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha" /></label>{authError && <p className="auth-error" role="alert">{authError}</p>}<button className="primary-button" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button><small>Os dados continuam em modo local durante a migração dos módulos.</small></form></main>;
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

function Contracts({ customers, equipment, contracts, setContracts, payments, setPayments, session, onNotice }: { customers: Customer[]; equipment: Equipment[]; contracts: Contract[]; setContracts: (items: Contract[]) => void; payments: Payment[]; setPayments: (items: Payment[]) => void; session: Session | null; onNotice: (message: string) => void }) {
  const [renewing, setRenewing] = useState<string | null>(null);
  const [days, setDays] = useState(1);

  async function renew(contract: Contract) {
    const additionalValue = contract.items.reduce((sum, item) => {
      const selectedEquipment = equipment.find((entry) => entry.id === item.equipmentId);
      return selectedEquipment ? sum + priceFor(selectedEquipment, days) * item.quantity : sum;
    }, 0);
    const renewal: Renewal = { id: crypto.randomUUID(), mode: "Novo ciclo de locação", date: new Date().toISOString(), additionalDays: days, additionalValue, newDueDate: addDays(contract.dueDate, days), user: "Administrador" };
    const renewalPayment: Payment = {
      id: crypto.randomUUID(),
      contractId: contract.id,
      customerId: contract.customerId,
      description: `Renovação de ${days} dia(s)`,
      dueAmount: additionalValue,
      receivedAmount: 0,
      dueDate: renewal.newDueDate,
      paymentDate: localDate(),
      method: "PIX",
      notes: "Gerado automaticamente pela renovação da locação.",
    };
    if (supabase && session) {
      const { data: savedRenewal, error: renewalError } = await supabase.from("contract_renewals").insert({
        contract_id: contract.id,
        mode: renewal.mode,
        date: renewal.date,
        additional_days: renewal.additionalDays,
        additional_value: renewal.additionalValue,
        new_due_date: renewal.newDueDate,
      }).select("id").single();
      if (renewalError || !savedRenewal) {
        onNotice(`Não foi possível salvar a renovação: ${renewalError?.message ?? "resposta vazia"}`);
        return;
      }
      const { error: contractError } = await supabase.from("contracts").update({
        due_date: renewal.newDueDate,
        total: contract.total + additionalValue,
        status: "Renovado",
      }).eq("id", contract.id);
      if (contractError) {
        await supabase.from("contract_renewals").delete().eq("id", savedRenewal.id);
        onNotice(`Não foi possível atualizar a locação: ${contractError.message}`);
        return;
      }
      const { data: savedPayment, error: paymentError } = await supabase.from("payments").insert({
        contract_id: contract.id,
        customer_id: contract.customerId,
        description: renewalPayment.description,
        due_amount: renewalPayment.dueAmount,
        received_amount: 0,
        due_date: renewalPayment.dueDate,
        payment_date: renewalPayment.paymentDate,
        method: renewalPayment.method,
        notes: renewalPayment.notes,
      }).select("id,contract_id,customer_id,description,due_amount,received_amount,due_date,payment_date,method,notes").single();
      if (paymentError || !savedPayment) {
        await supabase.from("contracts").update({ due_date: contract.dueDate, total: contract.total, status: contract.status }).eq("id", contract.id);
        await supabase.from("contract_renewals").delete().eq("id", savedRenewal.id);
        onNotice(`Não foi possível criar a cobrança da renovação: ${paymentError?.message ?? "resposta vazia"}`);
        return;
      }
      const persistedRenewal = { ...renewal, id: savedRenewal.id };
      setContracts(contracts.map((item) => item.id === contract.id ? { ...item, dueDate: renewal.newDueDate, total: item.total + additionalValue, status: "Renovado", renewals: [...item.renewals, persistedRenewal] } : item));
      setPayments([paymentFromRemoteRow(savedPayment), ...payments]);
    } else {
      setContracts(contracts.map((item) => item.id === contract.id ? { ...item, dueDate: renewal.newDueDate, total: item.total + additionalValue, status: "Renovado", renewals: [...item.renewals, renewal] } : item));
      setPayments([renewalPayment, ...payments]);
    }
    setRenewing(null);
    onNotice(`Renovação registrada. Valor adicional: ${money(additionalValue)}.`);
  }

  return <section><div className="section-heading"><div><p className="eyebrow">OPERAÇÃO</p><h1>Locações</h1><p>Contratos ativos, vencimentos e histórico de renovações.</p></div></div>{contracts.length === 0 ? <div className="panel"><div className="empty-state"><div className="empty-icon">↗</div><strong>Nenhuma locação criada</strong><p>Assine um orçamento para convertê-lo em contrato.</p></div></div> : <div className="contract-grid">{contracts.map((contract) => { const customer = customers.find((item) => item.id === contract.customerId); return <article className="contract-card" key={contract.id}><div className="contract-header"><div><p className="eyebrow">{contract.number}</p><h2>{customer?.name ?? "Cliente"}</h2></div><span className="quote-status contract-status">{contract.status}</span></div><div className="contract-details"><span>Início<strong>{new Date(`${contract.startDate}T12:00:00`).toLocaleDateString("pt-BR")}</strong></span><span>Devolução<strong>{new Date(`${contract.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}</strong></span><span>Valor acumulado<strong>{money(contract.total)}</strong></span></div><p className="contract-equipment">{contract.items.map((item) => `${item.quantity}x ${equipment.find((entry) => entry.id === item.equipmentId)?.name ?? "Equipamento"}`).join(" · ")}</p>{contract.renewals.length > 0 && <p className="renewal-history">{contract.renewals.length} renovação(ões) · último ciclo: {contract.renewals[contract.renewals.length - 1].additionalDays} dias / {money(contract.renewals[contract.renewals.length - 1].additionalValue)}</p>}{renewing === contract.id ? <div className="renew-form"><p className="renewal-help">Cada renovação é um novo ciclo. O valor será calculado pela faixa de preço dos dias renovados, sem alterar o que já foi cobrado.</p><label>Dias do novo ciclo<input type="number" min="1" value={days} onChange={(event) => setDays(Math.max(1, Number(event.target.value)))} /></label><div className="form-actions"><button className="secondary-button" onClick={() => setRenewing(null)}>Cancelar</button><button className="primary-button" onClick={() => renew(contract)}>Confirmar renovação</button></div></div> : <button className="secondary-button" onClick={() => setRenewing(contract.id)}>Renovar locação</button>}</article>; })}</div>}</section>;
}

function Finance({ customers, contracts, payments, setPayments, session, onNotice }: { customers: Customer[]; contracts: Contract[]; payments: Payment[]; setPayments: (items: Payment[]) => void; session: Session | null; onNotice: (message: string) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedContractId, setSelectedContractId] = useState("");
  const [receivedAmount, setReceivedAmount] = useState(0);
  const [paymentDate, setPaymentDate] = useState(localDate());
  const selectedContract = contracts.find((contract) => contract.id === selectedContractId);
  const selectedCharges = payments
    .filter((payment) => payment.contractId === selectedContractId && payment.receivedAmount < payment.dueAmount)
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  const selectedCharge = selectedCharges[0];
  const received = payments.reduce((sum, item) => sum + item.receivedAmount, 0);
  const pending = payments.reduce((sum, item) => sum + Math.max(0, item.dueAmount - item.receivedAmount), 0);

  async function savePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const contract = contracts.find((item) => item.id === selectedContractId);
    if (!contract) { onNotice("Selecione uma locação válida."); return; }
    const paymentMethod = String(data.get("method") ?? "PIX") as Payment["method"];
    const notes = String(data.get("notes") ?? "");
    const totalRemaining = selectedCharges.reduce((sum, payment) => sum + Math.max(0, payment.dueAmount - payment.receivedAmount), 0);
    if (receivedAmount > totalRemaining) {
      onNotice(`O recebimento não pode ser maior que o saldo pendente de ${money(totalRemaining)}.`);
      return;
    }
    const amountToApply = Math.max(0, receivedAmount);
    if (amountToApply <= 0 || selectedCharges.length === 0) {
      onNotice("Não há saldo pendente para esta locação.");
      return;
    }
    let remainingToApply = amountToApply;
    const allocations = new Map<string, number>();
    for (const payment of selectedCharges) {
      if (remainingToApply <= 0) break;
      const allocation = Math.min(Math.max(0, payment.dueAmount - payment.receivedAmount), remainingToApply);
      allocations.set(payment.id, allocation);
      remainingToApply -= allocation;
    }
    const updatedPayments = payments.map((payment) => {
      const allocation = allocations.get(payment.id) ?? 0;
      if (allocation <= 0) return payment;
      return {
        ...payment,
        receivedAmount: payment.receivedAmount + allocation,
        paymentDate,
        method: paymentMethod,
        notes: notes || payment.notes,
      };
    });
    if (supabase && session) {
      const chargesToUpdate = updatedPayments.filter((payment, index) => payment.receivedAmount !== payments[index].receivedAmount);
      const savedPayments: Payment[] = [];
      for (const payment of chargesToUpdate) {
        const { data: savedPayment, error } = await supabase.from("payments").update({
          received_amount: payment.receivedAmount,
          payment_date: payment.paymentDate,
          method: payment.method,
          notes: payment.notes,
        }).eq("id", payment.id).select("id,contract_id,customer_id,description,due_amount,received_amount,due_date,payment_date,method,notes").single();
        if (error || !savedPayment) {
          onNotice(`Não foi possível registrar o recebimento: ${error?.message ?? "resposta vazia"}`);
          return;
        }
        savedPayments.push(paymentFromRemoteRow(savedPayment));
      }
      setPayments(payments.map((payment) => savedPayments.find((saved) => saved.id === payment.id) ?? payment));
    } else {
      setPayments(updatedPayments);
    }
    setShowForm(false);
    onNotice("Lançamento financeiro salvo.");
    event.currentTarget.reset();
    setSelectedContractId("");
    setReceivedAmount(0);
    setPaymentDate(localDate());
  }

  const remaining = selectedCharges.reduce((sum, payment) => sum + Math.max(0, payment.dueAmount - payment.receivedAmount), 0);
  return <section><div className="section-heading"><div><p className="eyebrow">CONTROLE FINANCEIRO</p><h1>Financeiro</h1><p>As cobranças são geradas na locação; aqui você registra recebimentos parciais.</p></div><button className="primary-button" onClick={() => setShowForm(!showForm)}><span>+</span> Registrar recebimento</button></div><div className="finance-metrics"><div className="finance-metric"><span>Total recebido</span><strong>{money(received)}</strong></div><div className="finance-metric"><span>Total pendente</span><strong>{money(pending)}</strong></div><div className="finance-metric"><span>Lançamentos</span><strong>{payments.length}</strong></div></div>{showForm && <form className="form-card" onSubmit={savePayment}><div className="form-heading"><div><h2>Registrar recebimento</h2><p className="form-description">O valor devido e o vencimento vêm automaticamente da cobrança da locação.</p></div><button type="button" className="close-form" onClick={() => setShowForm(false)}>×</button></div><div className="form-grid"><label>Locação<select required name="contractId" value={selectedContractId} onChange={(event) => { setSelectedContractId(event.target.value); setReceivedAmount(0); }}><option value="">Selecione uma locação</option>{contracts.map((contract) => <option value={contract.id} key={contract.id}>{contract.number} - {customers.find((item) => item.id === contract.customerId)?.name}</option>)}</select></label><label>Descrição<input required name="description" defaultValue="Pagamento da locação" /></label><label>Valor devido<input required name="dueAmount" type="number" value={remaining} readOnly /></label><label>Valor recebido<input required name="receivedAmount" type="number" min="0" max={remaining} step="0.01" value={receivedAmount} onChange={(event) => setReceivedAmount(Number(event.target.value))} /><small className="field-help">Este é o saldo restante. Exemplo: uma cobrança de R$ 80,00 com R$ 40,00 recebidos mostrará R$ 40,00.</small></label><label>Vencimento<input required name="dueDate" type="date" value={selectedCharge?.dueDate ?? selectedContract?.dueDate ?? ""} readOnly /></label><label>Data do pagamento<input name="paymentDate" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} /></label><label>Forma de pagamento<select name="method"><option>PIX</option><option>Dinheiro</option><option>Transferência</option><option>Outros</option></select></label><label>Observações<input name="notes" /></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button" disabled={!selectedCharge || remaining <= 0}>Salvar recebimento</button></div></form>}{payments.length === 0 ? <div className="panel"><div className="empty-state"><div className="empty-icon soft">R$</div><strong>Nenhum lançamento financeiro</strong><p>As cobranças são criadas automaticamente ao converter um orçamento em locação.</p></div></div> : <div className="panel table-panel"><div className="table-wrap"><table><thead><tr><th>CLIENTE</th><th>DESCRIÇÃO</th><th>DEVIDO</th><th>RECEBIDO</th><th>VENCIMENTO</th><th>STATUS</th></tr></thead><tbody>{payments.map((payment) => { const customer = customers.find((item) => item.id === payment.customerId); const status = payment.receivedAmount >= payment.dueAmount ? "Pago" : payment.receivedAmount > 0 ? "Pago parcialmente" : new Date(`${payment.dueDate}T23:59:59`) < new Date() ? "Atrasado" : "Pendente"; return <tr key={payment.id}><td><strong>{customer?.name ?? "Cliente"}</strong></td><td>{payment.description}</td><td>{money(payment.dueAmount)}</td><td>{money(payment.receivedAmount)}</td><td>{new Date(`${payment.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}</td><td><span className={`quote-status ${status === "Pago" ? "paid-status" : ""}`}>{status}</span></td></tr>; })}</tbody></table></div></div>}</section>;
}

function Collections({ customers, equipment, contracts, payments, tasks, setTasks, session, onNotice }: { customers: Customer[]; equipment: Equipment[]; contracts: Contract[]; payments: Payment[]; tasks: CollectionTask[]; setTasks: (items: CollectionTask[]) => void; session: Session | null; onNotice: (message: string) => void }) {
  const [filter, setFilter] = useState<"today" | "tomorrow" | "week" | "overdue" | "all" | "date">("today");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dateValue = (date: string) => new Date(`${date}T00:00:00`);
  const daysFromToday = (date: string) => Math.round((dateValue(date).getTime() - today.getTime()) / 86400000);
  const matchesFilter = (date: string) => {
    const difference = daysFromToday(date);
    if (filter === "today") return difference === 0;
    if (filter === "tomorrow") return difference === 1;
    if (filter === "week") return difference >= 0 && difference <= 7;
    if (filter === "overdue") return difference < 0;
    if (filter === "date") return date === selectedDate;
    return true;
  };
  const activeContracts = contracts.filter((contract) => contract.status !== "Encerrado" && contract.status !== "Cancelado" && matchesFilter(contract.dueDate));
  const taskFor = (contractId: string) => tasks.find((task) => task.contractId === contractId)?.status ?? "Pendente";
  const paymentFor = (contract: Contract) => payments.filter((payment) => payment.contractId === contract.id).reduce((sum, payment) => sum + payment.receivedAmount, 0) >= contract.total ? "Pago" : "Pendente";
  const addressFor = (customer: Customer, contract: Contract) => customer.workAddresses?.[contract.workAddressIndex];
  const addressQuery = (customer: Customer, contract: Contract) => {
    const address = addressFor(customer, contract);
    return address ? `${address.street}, ${address.number}, ${address.neighborhood}, ${address.city}` : "";
  };
  async function updateTask(contractId: string, status: CollectionStatus) {
    const existing = tasks.find((task) => task.contractId === contractId);
    const updatedAt = new Date().toISOString();
    if (supabase && session) {
      if (existing) {
        const { data, error } = await supabase.from("collection_tasks").update({ status, updated_at: updatedAt }).eq("id", existing.id).select("id,contract_id,status,updated_at").single();
        if (error || !data) {
          onNotice(`Não foi possível atualizar o recolhimento: ${error?.message ?? "resposta vazia"}`);
          return;
        }
        setTasks(tasks.map((task) => task.id === existing.id ? collectionTaskFromRemoteRow(data) : task));
      } else {
        const { data, error } = await supabase.from("collection_tasks").insert({ contract_id: contractId, status, updated_at: updatedAt }).select("id,contract_id,status,updated_at").single();
        if (error || !data) {
          onNotice(`Não foi possível salvar o recolhimento: ${error?.message ?? "resposta vazia"}`);
          return;
        }
        setTasks([...tasks, collectionTaskFromRemoteRow(data)]);
      }
    } else {
      setTasks(existing ? tasks.map((task) => task.contractId === contractId ? { ...task, status, updatedAt } : task) : [...tasks, { id: crypto.randomUUID(), contractId, status, updatedAt }]);
    }
    onNotice(`Recolhimento marcado como: ${status}.`);
  }
  function whatsapp(customer: Customer, contract: Contract) {
    const phone = customer.phone.replace(/\D/g, "");
    if (!phone) {
      onNotice("Este cliente não possui telefone cadastrado.");
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(`Olá, ${customer.name}. Gostaríamos de confirmar o recolhimento dos equipamentos da locação ${contract.number}.`)}`, "_blank", "noopener,noreferrer");
  }
  return <section><div className="section-heading"><div><p className="eyebrow">ROTEIRO DE OPERAÇÃO</p><h1>Recolhimentos do dia</h1><p>Organize as entregas, recolhimentos e renovações nas obras.</p></div><span className="collection-count">{activeContracts.length} registro(s)</span></div><div className="collection-filters"><button className={filter === "today" ? "filter-active" : ""} onClick={() => setFilter("today")}>Hoje</button><button className={filter === "tomorrow" ? "filter-active" : ""} onClick={() => setFilter("tomorrow")}>Amanhã</button><button className={filter === "week" ? "filter-active" : ""} onClick={() => setFilter("week")}>Próximos 7 dias</button><button className={filter === "overdue" ? "filter-active" : ""} onClick={() => setFilter("overdue")}>Somente vencidos</button><button className={filter === "all" ? "filter-active" : ""} onClick={() => setFilter("all")}>Todos</button><label className={filter === "date" ? "filter-active" : ""}>Escolher data<input type="date" value={selectedDate} onChange={(event) => { setSelectedDate(event.target.value); setFilter("date"); }} /></label></div>{activeContracts.length === 0 ? <div className="panel"><div className="empty-state"><div className="empty-icon">✓</div><strong>Nenhum recolhimento neste filtro</strong><p>Altere o período ou consulte todos os contratos ativos.</p></div></div> : <div className="collection-list">{activeContracts.map((contract) => { const customer = customers.find((item) => item.id === contract.customerId); if (!customer) return null; const address = addressFor(customer, contract); const taskStatus = taskFor(contract.id); const paymentStatus = paymentFor(contract); const overdue = daysFromToday(contract.dueDate) < 0; const mapUrl = address?.locationUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressQuery(customer, contract))}`; return <article className={`collection-card collection-${taskStatus.toLowerCase().replaceAll(" ", "-")}`} key={contract.id}><div className="collection-main"><div className={`collection-dot ${paymentStatus === "Pago" ? "dot-green" : overdue ? "dot-red" : contract.status === "Renovado" ? "dot-blue" : "dot-yellow"}`} /><div className="collection-info"><div className="collection-title"><h2>{customer.name}</h2><span className="quote-status">{taskStatus}</span></div><p className="collection-address">{address ? `${address.street}, ${address.number} - ${address.neighborhood}, ${address.city}` : "Endereço da obra não informado"}</p><p className="collection-equipment">{contract.items.map((item) => `${item.quantity}x ${equipment.find((entry) => entry.id === item.equipmentId)?.name ?? "Equipamento"}`).join(" · ")}</p></div><div className="collection-due"><span>VENCIMENTO</span><strong>{new Date(`${contract.dueDate}T12:00:00`).toLocaleDateString("pt-BR")}</strong><small>{paymentStatus === "Pago" ? "Pagamento realizado" : "Pagamento pendente"}</small></div></div><div className="collection-actions"><a className="secondary-button" href={mapUrl} target="_blank" rel="noopener noreferrer">Abrir Maps</a><a className="secondary-button" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addressQuery(customer, contract))}`} target="_blank" rel="noopener noreferrer">Navegar</a><button className="secondary-button" onClick={() => whatsapp(customer, contract)}>WhatsApp</button><select value={taskStatus} onChange={(event) => updateTask(contract.id, event.target.value as CollectionStatus)}><option>Pendente</option><option>Realizado</option><option>Renovação solicitada</option><option>Cliente não encontrado</option></select></div></article>; })}</div>}</section>;
}

function EquipmentList({ equipment, setEquipment, session, onNotice }: { equipment: Equipment[]; setEquipment: (items: Equipment[]) => void; session: Session | null; onNotice: (message: string) => void }) {
  const [showForm, setShowForm] = useState(false);

  async function toggle(id: string) {
    const item = equipment.find((entry) => entry.id === id);
    if (!item) return;
    const active = !item.active;
    if (supabase && session) {
      const { error } = await supabase.from("equipment").update({ active }).eq("id", id);
      if (error) {
        onNotice(`Não foi possível atualizar o equipamento: ${error.message}`);
        return;
      }
    }
    setEquipment(equipment.map((entry) => entry.id === id ? { ...entry, active } : entry));
  }

  async function saveEquipment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const category = String(data.get("category") ?? "").trim();
    const billing = String(data.get("billing") ?? "Diária");
    const billingMode = String(data.get("billingMode") ?? "daily");
    const amount = Number(data.get("amount") ?? 0);
    const minDays = Number(data.get("minDays") ?? 1);
    const maxDaysValue = String(data.get("maxDays") ?? "").trim();
    const maxDays = maxDaysValue ? Number(maxDaysValue) : undefined;
    if (!name || !category || !Number.isFinite(amount) || amount < 0 || !Number.isInteger(minDays) || minDays < 1 || (maxDays !== undefined && (!Number.isInteger(maxDays) || maxDays < minDays))) {
      onNotice("Informe os dados do equipamento e uma regra de preço válida.");
      return;
    }
    const pricing = [{ minDays, ...(maxDays === undefined ? {} : { maxDays }), amount }];
    const rules = `${minDays}${maxDays === undefined ? "+" : `-${maxDays}`}d: ${money(amount)}`;
    if (supabase && session) {
      const { data: saved, error } = await supabase
        .from("equipment")
        .insert({ name, category, billing_unit: billing, billing_mode: billingMode, active: true })
        .select("id,name,category,billing_unit,billing_mode,active")
        .single();
      if (error || !saved) {
        onNotice(`Não foi possível salvar o equipamento no Supabase: ${error?.message ?? "resposta vazia"}`);
        return;
      }
      const { error: ruleError } = await supabase.from("equipment_price_rules").insert({
        equipment_id: saved.id,
        min_days: minDays,
        max_days: maxDays ?? null,
        amount,
      });
      if (ruleError) {
        await supabase.from("equipment").delete().eq("id", saved.id);
        onNotice(`Não foi possível salvar a regra de preço: ${ruleError.message}`);
        return;
      }
      setEquipment([...equipment, { id: saved.id, name: saved.name, category: saved.category, billing: saved.billing_unit, billingMode: saved.billing_mode, active: saved.active, rules, pricing }]);
    } else {
      setEquipment([...equipment, { id: crypto.randomUUID(), name, category, billing, billingMode, active: true, rules, pricing }]);
    }
    form.reset();
    setShowForm(false);
    onNotice("Equipamento cadastrado com sucesso.");
  }

  return <section><div className="section-heading"><div><p className="eyebrow">CATÁLOGO E PREÇOS</p><h1>Equipamentos</h1><p>Configure os equipamentos e as regras de cobrança da empresa.</p></div><button className="primary-button" onClick={() => setShowForm(!showForm)}><span>+</span> Novo equipamento</button></div>{showForm && <form className="form-card" onSubmit={saveEquipment}><div className="form-heading"><div><h2>Novo equipamento</h2><p className="form-description">A primeira regra de preço será salva junto com o equipamento.</p></div><button type="button" className="close-form" onClick={() => setShowForm(false)}>×</button></div><div className="form-grid"><label>Nome<input required name="name" /></label><label>Categoria<input required name="category" /></label><label>Unidade de cobrança<input required name="billing" defaultValue="Diária" /></label><label>Modo<select name="billingMode" defaultValue="daily"><option value="daily">Por diária</option><option value="period">Por período</option></select></label><label>Início da faixa (dias)<input required name="minDays" type="number" min="1" defaultValue="1" /></label><label>Fim da faixa (dias)<input name="maxDays" type="number" min="1" placeholder="Sem limite" /></label><label>Valor da faixa<input required name="amount" type="number" min="0" step="0.01" /></label></div><div className="form-actions"><button type="button" className="secondary-button" onClick={() => setShowForm(false)}>Cancelar</button><button className="primary-button">Salvar equipamento</button></div></form>}<div className="equipment-grid">{equipment.map((item) => <article className={`equipment-card ${!item.active ? "inactive" : ""}`} key={item.id}><div className="equipment-top"><div className="equipment-symbol">▣</div><button className={`status-pill ${item.active ? "status-active" : "status-inactive"}`} onClick={() => void toggle(item.id)}>{item.active ? "Ativo" : "Inativo"}</button></div><p className="equipment-category">{item.category}</p><h2>{item.name}</h2><p className="equipment-billing">Cobrança: <strong>{item.billing}</strong></p><div className="price-rule"><span>Regra de preço</span><strong>{item.rules}</strong></div></article>)}</div></section>;
}

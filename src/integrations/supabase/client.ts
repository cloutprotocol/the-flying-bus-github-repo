// Deprecated Supabase client stub.
// This module intentionally provides no-op implementations so legacy imports
// in tests and unused services don’t break. All runtime logic has moved to Convex.

type QueryResponse<T = any> = Promise<{ data: T | null; error: { message: string; code?: string } | null; count?: number }>;
type Chain = {
  select: (..._args: any[]) => Chain;
  insert: (..._args: any[]) => Chain;
  update: (..._args: any[]) => Chain;
  delete: (..._args: any[]) => Chain;
  eq: (..._args: any[]) => Chain;
  in: (..._args: any[]) => Chain;
  order: (..._args: any[]) => Chain;
  limit: (..._args: any[]) => Chain;
  range: (..._args: any[]) => Chain;
  maybeSingle: () => QueryResponse;
  single: () => QueryResponse;
  then?: any;
};

function chain(): Chain {
  const terminal: QueryResponse = Promise.resolve({ data: null, error: { message: 'Supabase removed. Use Convex.' } });
  const c: any = {
    select: () => c,
    insert: () => c,
    update: () => c,
    delete: () => c,
    eq: () => c,
    in: () => c,
    order: () => c,
    limit: () => c,
    range: () => c,
    maybeSingle: () => terminal,
    single: () => terminal,
  };
  return c as Chain;
}

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: { message: 'Supabase removed. Use Convex Auth.' } }),
    getUser: async () => ({ data: { user: null }, error: { message: 'Supabase removed. Use Convex Auth.' } }),
    onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe() {} } }, error: null }),
    signUp: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase removed. Use Convex Auth.' } }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase removed. Use Convex Auth.' } }),
    signOut: async () => ({ error: null }),
  },
  from: (_table: string) => chain(),
  rpc: async (_fn: string, _args?: any) => ({ data: null, error: { message: 'Supabase removed. Use Convex.' } }),
  functions: {
    invoke: async (_name: string, _options?: any) => ({ data: null, error: { message: 'Supabase removed. Use Convex.' } }),
  },
  storage: {
    from: (_bucket: string) => ({
      upload: async () => ({ data: null, error: { message: 'Supabase removed. Use Convex.' } }),
      remove: async () => ({ data: null, error: { message: 'Supabase removed. Use Convex.' } }),
      getPublicUrl: (_path: string) => ({ data: { publicUrl: '' } }),
    }),
  },
} as const;


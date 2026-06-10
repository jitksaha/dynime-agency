import { api, apiGet, apiPost } from './api';

class SupabaseQueryBuilder {
  private table: string;
  private action: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private filters: Array<{ column: string; type: string; value: any }> = [];
  private orderList: Array<{ column: string; ascending: boolean }> = [];
  private limitCount: number | null = null;
  private isSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(columns?: string) {
    this.action = 'select';
    return this;
  }

  insert(values: any) {
    this.action = 'insert';
    this.payload = values;
    return this;
  }

  update(values: any) {
    this.action = 'update';
    this.payload = values;
    return this;
  }

  delete() {
    this.action = 'delete';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, type: 'eq', value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ column, type: 'neq', value });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push({ column, type: 'gt', value });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push({ column, type: 'lt', value });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push({ column, type: 'gte', value });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push({ column, type: 'lte', value });
    return this;
  }

  like(column: string, value: any) {
    this.filters.push({ column, type: 'like', value });
    return this;
  }

  ilike(column: string, value: any) {
    this.filters.push({ column, type: 'ilike', value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ column, type: 'in', value: values });
    return this;
  }

  is(column: string, value: any) {
    this.filters.push({ column, type: 'is', value });
    return this;
  }

  // Supabase PostgREST-style OR filter: ".or('type.eq.email,label.ilike.%email%')"
  // We parse the string and add individual OR-group filters for the backend proxy.
  or(filterString: string) {
    this.filters.push({ column: '__or__', type: 'or', value: filterString });
    return this;
  }

  order(column: string, { ascending = true } = {}) {
    this.orderList.push({ column, ascending });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  // Allows thenable/promise execution (for async/await)
  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await apiPost<any>('/supabase-proxy', {
        table: this.table,
        action: this.action,
        payload: this.payload,
        filters: this.filters,
        order: this.orderList,
        limit: this.limitCount,
        single: this.isSingle,
      });
      if (onfulfilled) {
        return onfulfilled(res);
      }
      return res;
    } catch (err: any) {
      const errorResponse = {
        data: null,
        error: { message: err?.message || 'Request failed' },
      };
      if (onfulfilled) {
        return onfulfilled(errorResponse);
      }
      return errorResponse;
    }
  }
}

const authMock = {
  getUser: async () => {
    try {
      const res = await apiGet<any>('/auth/me');
      if (res?.id) {
        return {
          data: {
            user: {
              id: String(res.id),
              email: res.email,
              user_metadata: { full_name: res.name },
            },
          },
          error: null,
        };
      }
      return { data: { user: null }, error: null };
    } catch (err: any) {
      return { data: { user: null }, error: { message: err?.message } };
    }
  },

  getSession: async () => {
    const token = localStorage.getItem('dynime_admin_token');
    if (token) {
      try {
        const res = await apiGet<any>('/auth/me');
        if (res?.id) {
          return {
            data: {
              session: {
                access_token: token,
                user: {
                  id: String(res.id),
                  email: res.email,
                  user_metadata: { full_name: res.name },
                },
              },
            },
            error: null,
          };
        }
      } catch (err) {}
    }
    return { data: { session: null }, error: null };
  },

  signOut: async () => {
    try {
      await apiPost('/auth/logout');
    } catch (err) {}
    localStorage.removeItem('dynime_admin_token');
    return { error: null };
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const token = localStorage.getItem('dynime_admin_token');
    if (token) {
      apiGet<any>('/auth/me')
        .then((user) => {
          if (user?.id) {
            callback('SIGNED_IN', {
              access_token: token,
              user: {
                id: String(user.id),
                email: user.email,
                user_metadata: { full_name: user.name },
              },
            });
          }
        })
        .catch(() => {});
    }
    return {
      data: {
        subscription: {
          unsubscribe: () => {},
        },
      },
    };
  },
};

const functionsMock = {
  invoke: async (name: string, { body }: { body?: any } = {}) => {
    try {
      const res = await apiPost<any>(`/supabase-proxy/functions/${name}`, body || {});
      return res;
    } catch (err: any) {
      return { data: null, error: { message: err?.message } };
    }
  },
};

const storageMock = {
  from: (bucket: string) => ({
    upload: async (path: string, file: File, options?: any) => {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', bucket || 'uploads');
        const res = await api.post<any>('/admin/media/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return { data: { path: res.data?.path || path }, error: null };
      } catch (err: any) {
        return { data: null, error: { message: err?.message } };
      }
    },
    remove: async (paths: string[]) => {
      // Mock remove success
      return { data: paths, error: null };
    },
    getPublicUrl: (path: string) => {
      const base = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';
      return {
        data: {
          publicUrl: `${base}/storage/${path}`,
        },
      };
    },
  }),
};

class SupabaseChannelMock {
  on(event: string, filter: any, callback?: any) {
    return this;
  }
  subscribe() {
    return this;
  }
}

export const supabase = {
  from: (table: string) => new SupabaseQueryBuilder(table),
  auth: authMock,
  functions: functionsMock,
  storage: storageMock,
  rpc: async (functionName: string, params: any = {}) => {
    try {
      const res = await apiPost<any>(`/supabase-proxy/rpc/${functionName}`, params);
      return res;
    } catch (err: any) {
      return { data: null, error: { message: err?.message } };
    }
  },
  channel: () => new SupabaseChannelMock(),
  removeChannel: () => {},
};

// Seeds realistic payroll history from Jan 2020 → current month.
// Idempotent. Admin-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Deterministic RNG (mulberry32)
function rngFromString(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const ri = (r: () => number, lo: number, hi: number) => Math.floor(lo + r() * (hi - lo + 1));
const rf = (r: () => number, lo: number, hi: number) => +(lo + r() * (hi - lo)).toFixed(2);
const chance = (r: () => number, p: number) => r() < p;

function workingDaysInMonth(y: number, m: number) {
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  let wd = 0;
  for (let d = 1; d <= last; d++) {
    const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
    if (dow !== 0 && dow !== 6) wd++;
  }
  return wd;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // auth
    const auth = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { data: isAdminRow } = await userClient.rpc("is_admin", { _user_id: u.user.id });
    if (!isAdminRow) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const startYear = body.start_year ?? 2020;
    const startMonth = body.start_month ?? 1;
    const wipe = body.wipe === true;

    const sb = createClient(SUPABASE_URL, SERVICE_KEY);

    if (wipe) {
      await sb.from("payroll_audit_logs").delete().not("id", "is", null);
      await sb.from("payroll_adjustments").delete().not("id", "is", null);
      await sb.from("payroll_payslips").delete().not("id", "is", null);
      await sb.from("payroll_items").delete().not("id", "is", null);
      await sb.from("payroll_runs").delete().not("id", "is", null);
      await sb.from("payroll_salary_history").delete().not("id", "is", null);
    }

    const { data: employees, error: eErr } = await sb
      .from("employees").select("*")
      .eq("status", "active")
      .order("joining_date", { ascending: true });
    if (eErr) throw eErr;

    // 1) Build salary history per employee (0-3 raises)
    for (const e of employees ?? []) {
      const r = rngFromString("sal:" + e.id);
      const join = new Date(e.joining_date);
      const baseStart = Number(e.gross_salary) || 250;
      // walk backwards: the *current* salary is e.gross_salary; insert past lower salaries
      const today = new Date();
      const yearsTenure = Math.max(0, today.getUTCFullYear() - join.getUTCFullYear());
      const raises = Math.min(3, Math.max(0, Math.floor(yearsTenure / 2) + (chance(r, 0.5) ? 1 : 0)));
      // build raise dates spread across tenure
      const rows: Array<{ from: string; to: string | null; base: number }> = [];
      let curBase = baseStart;
      const events: Date[] = [];
      for (let i = 0; i < raises; i++) {
        const yearsBack = (i + 1) * (yearsTenure / (raises + 1));
        const d = new Date(today); d.setUTCFullYear(today.getUTCFullYear() - Math.round(yearsBack));
        d.setUTCMonth(ri(r, 0, 11)); d.setUTCDate(1);
        if (d > join) events.push(d);
      }
      events.sort((a, b) => a.getTime() - b.getTime());
      // earliest segment from join
      let segStart = join;
      let segBase = curBase;
      for (const ev of events) {
        const pctBack = rf(r, 0.10, 0.25); // raise of 10-25%
        const earlier = +(segBase / (1 + pctBack)).toFixed(2);
        rows.push({ from: segStart.toISOString().slice(0, 10), to: new Date(ev.getTime() - 86400000).toISOString().slice(0, 10), base: earlier });
        segStart = ev;
        segBase = segBase; // current segBase stays as current then we update earlier rows
        // upon next iter, we'll create older earlier salary
        segBase = earlier; // no — wrong logic. Reset.
      }
      // Simpler: forget walk-back; instead store one row per current segment with current salary, treat earlier rows as -10..25% per step back.
      // Implement simple approach below — overwrite rows:
      rows.length = 0;
      let baseNow = baseStart;
      let endDate: string | null = null;
      // current row from latest event (or join)
      const segs: Array<{ from: Date; base: number }> = [{ from: events[events.length - 1] ?? join, base: baseNow }];
      for (let i = events.length - 1; i >= 0; i--) {
        const pct = rf(r, 0.10, 0.25);
        baseNow = +(baseNow / (1 + pct)).toFixed(2);
        const from = i === 0 ? join : events[i - 1];
        segs.push({ from, base: baseNow });
      }
      segs.sort((a, b) => a.from.getTime() - b.from.getTime());
      for (let i = 0; i < segs.length; i++) {
        const nxt = segs[i + 1];
        rows.push({
          from: segs[i].from.toISOString().slice(0, 10),
          to: nxt ? new Date(nxt.from.getTime() - 86400000).toISOString().slice(0, 10) : null,
          base: segs[i].base,
        });
      }
      // upsert
      for (const row of rows) {
        await sb.from("payroll_salary_history").upsert({
          employee_id: e.id,
          effective_from: row.from,
          effective_to: row.to,
          base_salary: row.base,
          currency: e.currency || "USD",
          reason: "Historical seed",
        }, { onConflict: "employee_id,effective_from" });
      }
    }

    // 2) Iterate months
    const now = new Date();
    const endY = now.getUTCFullYear(), endM = now.getUTCMonth() + 1;
    const monthsCreated: string[] = [];
    let y = startYear, m = startMonth;

    while (y < endY || (y === endY && m <= endM)) {
      const pstart = new Date(Date.UTC(y, m - 1, 1));
      const pend = new Date(Date.UTC(y, m, 0));
      const wd = workingDaysInMonth(y, m);

      const eligible = (employees ?? []).filter((e) => {
        const join = new Date(e.joining_date);
        return join <= pend && (!e.last_working_day || new Date(e.last_working_day) >= pstart);
      });

      if (eligible.length === 0) {
        if (m === 12) { y++; m = 1; } else m++;
        continue;
      }

      // ---- Seed attendance + leaves for each eligible employee for this month
      for (const e of eligible) {
        const r = rngFromString(`att:${e.id}:${y}-${m}`);
        // generate per-day attendance for workdays
        const absentTarget = ri(r, 0, 2);
        const lateTarget = ri(r, 0, 3);
        const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
        const workdays: number[] = [];
        for (let d = 1; d <= days; d++) {
          const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
          if (dow !== 0 && dow !== 6) workdays.push(d);
        }
        // shuffle then pick
        const shuffled = [...workdays].sort(() => r() - 0.5);
        const absents = new Set(shuffled.slice(0, absentTarget));
        const lates = new Set(shuffled.slice(absentTarget, absentTarget + lateTarget));
        const overtimeDays = chance(r, 0.4) ? shuffled.slice(absentTarget + lateTarget, absentTarget + lateTarget + ri(r, 1, 4)) : [];

        const rows = workdays.map((d) => {
          const date = new Date(Date.UTC(y, m - 1, d)).toISOString().slice(0, 10);
          let status: string = "present";
          let total_minutes = 480;
          if (absents.has(d)) { status = "absent"; total_minutes = 0; }
          else if (lates.has(d)) { status = "late"; total_minutes = 450; }
          else if (overtimeDays.includes(d)) { status = "overtime"; total_minutes = 480 + ri(r, 60, 180); }
          return {
            employee_id: e.id, work_date: date, status, total_minutes,
            source: "seed", break_minutes: 30,
          };
        });
        // upsert in batches; ignore conflicts on (employee_id, work_date) if a unique constraint exists
        for (let i = 0; i < rows.length; i += 200) {
          await sb.from("attendance_records").upsert(rows.slice(i, i + 200), { onConflict: "employee_id,work_date", ignoreDuplicates: true });
        }

        // occasional leave request (paid)
        if (chance(r, 0.18)) {
          const { data: lt } = await sb.from("leave_types").select("id,is_paid").eq("is_active", true).limit(10);
          if (lt && lt.length) {
            const pick = lt[ri(r, 0, lt.length - 1)];
            const startDay = workdays[ri(r, 0, workdays.length - 1)];
            const dur = ri(r, 1, 2);
            const from = new Date(Date.UTC(y, m - 1, startDay)).toISOString().slice(0, 10);
            const to = new Date(Date.UTC(y, m - 1, Math.min(startDay + dur - 1, pend.getUTCDate()))).toISOString().slice(0, 10);
            // unique-ish guard: check existence
            const { data: ex } = await sb.from("leave_requests").select("id")
              .eq("employee_id", e.id).eq("from_date", from).maybeSingle();
            if (!ex) {
              await sb.from("leave_requests").insert({
                employee_id: e.id, leave_type_id: pick.id,
                from_date: from, to_date: to, days: dur, status: "approved",
                reason: "Seeded historical leave",
              });
            }
          }
        }
      }

      // ---- Generate run via RPC (as service role: emulate by calling RPC; service role bypasses RLS check inside function?)
      // The RPC has `is_admin(auth.uid())` guard; service role has no auth.uid(). Call as user via userClient instead.
      const { data: runId, error: gErr } = await userClient.rpc("payroll_generate_run", {
        _year: y, _month: m, _currency: "USD", _working_days: wd, _employee_ids: null, _replace: true,
      });
      if (gErr) throw gErr;

      // ---- Add per-employee adjustments via service role to bypass needing auth checks redundantly
      // Use service role to fetch items, then call RPC with userClient
      const { data: items } = await sb.from("payroll_items").select("id,employee_id,base_salary,allowances_total,deductions_total,net_pay").eq("run_id", runId);
      for (const it of items ?? []) {
        const r = rngFromString(`adj:${it.employee_id}:${y}-${m}`);
        const allowances: Array<{ kind: string; label: string; amt: number }> = [];
        const deductions: Array<{ kind: string; label: string; amt: number }> = [];
        if (chance(r, 0.92)) allowances.push({ kind: "transport", label: "Transport", amt: rf(r, 10, 40) });
        if (chance(r, 0.85)) allowances.push({ kind: "food", label: "Food", amt: rf(r, 15, 50) });
        if (chance(r, 0.7))  allowances.push({ kind: "internet", label: "Internet", amt: rf(r, 10, 30) });
        if (chance(r, 0.10)) allowances.push({ kind: "bonus", label: "Performance bonus", amt: rf(r, 30, 150) });
        if (chance(r, 0.15)) allowances.push({ kind: "overtime", label: "Overtime pay", amt: rf(r, 15, 90) });
        if (chance(r, 0.08)) deductions.push({ kind: "loan", label: "Loan repayment", amt: rf(r, 20, 60) });
        if (chance(r, 0.04)) deductions.push({ kind: "penalty", label: "Policy penalty", amt: rf(r, 10, 30) });

        let allowSum = 0, dedSum = 0;
        for (const a of allowances) {
          await sb.from("payroll_adjustments").insert({ item_id: it.id, kind: a.kind, category: "allowance", label: a.label, amount: a.amt, note: "seed" });
          allowSum += a.amt;
        }
        for (const d of deductions) {
          await sb.from("payroll_adjustments").insert({ item_id: it.id, kind: d.kind, category: "deduction", label: d.label, amount: d.amt, note: "seed" });
          dedSum += d.amt;
        }
        if (allowSum || dedSum) {
          await sb.from("payroll_items").update({
            allowances_total: Number(it.allowances_total) + allowSum,
            deductions_total: Number(it.deductions_total) + dedSum,
            net_pay: Number(it.net_pay) + allowSum - dedSum,
          }).eq("id", it.id);
        }
      }

      // recompute totals
      await userClient.rpc("payroll_recompute_totals", { _run: runId });

      // Approve & mark paid — past months always; current month sometimes pending
      const isCurrent = (y === endY && m === endM);
      const isRecent = (y === endY && m >= endM - 1) || (y === endY - 1 && m === 12 && endM === 1);

      await userClient.rpc("payroll_approve_run", { _run: runId });
      if (isCurrent) {
        // leave a couple unpaid in current month
        const itemIds = (items ?? []).map((x) => x.id);
        const r = rngFromString(`pay:${y}-${m}`);
        const payN = Math.max(1, Math.floor(itemIds.length * 0.6));
        const toPay = itemIds.sort(() => r() - 0.5).slice(0, payN);
        if (toPay.length) await userClient.rpc("payroll_mark_paid", { _run: runId, _item_ids: toPay, _method: "bank" });
      } else if (isRecent && chance(rngFromString(`rec:${y}-${m}`), 0.4)) {
        // partial last month
        const itemIds = (items ?? []).map((x) => x.id);
        const r2 = rngFromString(`rec2:${y}-${m}`);
        const payN = Math.max(1, Math.floor(itemIds.length * 0.85));
        const toPay = itemIds.sort(() => r2() - 0.5).slice(0, payN);
        await userClient.rpc("payroll_mark_paid", { _run: runId, _item_ids: toPay, _method: "bank" });
      } else {
        await userClient.rpc("payroll_mark_paid", { _run: runId, _item_ids: null, _method: "bank" });
      }

      monthsCreated.push(`${y}-${String(m).padStart(2, "0")}`);
      if (m === 12) { y++; m = 1; } else m++;
    }

    return new Response(JSON.stringify({ ok: true, months: monthsCreated.length, sample: monthsCreated.slice(-6) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

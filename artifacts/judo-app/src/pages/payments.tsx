import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListPayments,
  useCreatePayment,
  useUpdatePayment,
  useDeletePayment,
  useGetMe,
  useListAthletes,
  useGetClubPaymentSummary,
  getListPaymentsQueryKey,
  getGetClubPaymentSummaryQueryKey,
} from "@workspace/api-client-react";
import Layout from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CreditCard, CheckCircle, AlertCircle, Clock, Trash2 } from "lucide-react";

export default function PaymentsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: user } = useGetMe();
  const clubId = user?.clubId;

  const { data: payments = [], isLoading } = useListPayments(
    clubId ? { clubId } : {}
  );
  const { data: summary } = useGetClubPaymentSummary(clubId ?? 0, {
    query: {
      enabled: !!clubId,
      queryKey: getGetClubPaymentSummaryQueryKey(clubId ?? 0)
    }
  });
  const { data: athletes = [] } = useListAthletes(clubId ? { clubId } : {});

  const createPayment = useCreatePayment();
  const updatePayment = useUpdatePayment();
  const deletePayment = useDeletePayment();

  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    athleteId: "", amount: "", currency: "RUB", description: "", dueDate: "", notes: ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clubId || !form.athleteId || !form.amount || !form.description) return;
    createPayment.mutate(
      {
        data: {
          clubId,
          athleteId: parseInt(form.athleteId),
          amount: parseFloat(form.amount),
          currency: form.currency,
          description: form.description,
          dueDate: form.dueDate || undefined,
          notes: form.notes || undefined,
        }
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetClubPaymentSummaryQueryKey(clubId) });
          setOpen(false);
          setForm({ athleteId: "", amount: "", currency: "RUB", description: "", dueDate: "", notes: "" });
        }
      }
    );
  };

  const handleMarkPaid = (paymentId: number) => {
    updatePayment.mutate(
      { paymentId, data: { status: "paid", paidAt: new Date().toISOString().split("T")[0] } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetClubPaymentSummaryQueryKey(clubId ?? 0) });
        }
      }
    );
  };

  const handleDelete = (paymentId: number) => {
    deletePayment.mutate(
      { paymentId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetClubPaymentSummaryQueryKey(clubId ?? 0) });
        }
      }
    );
  };

  const filtered = statusFilter === "all"
    ? payments
    : payments.filter(p => p.status === statusFilter);

  const statusBadge = (status: string) => {
    if (status === "paid") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="h-3 w-3 mr-1" />{t("Paid")}</Badge>;
    if (status === "overdue") return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />{t("Overdue")}</Badge>;
    return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />{t("Pending")}</Badge>;
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">{t("Payments")}</h1>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-payment">
                <Plus className="h-4 w-4 mr-2" />
                {t("AddPayment")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("AddPayment")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("Athletes")} *</Label>
                  <Select value={form.athleteId} onValueChange={v => setForm(f => ({ ...f, athleteId: v }))}>
                    <SelectTrigger data-testid="select-athlete-payment"><SelectValue placeholder="Выберите спортсмена" /></SelectTrigger>
                    <SelectContent>
                      {athletes.map(a => (
                        <SelectItem key={a.id} value={String(a.id)}>{a.firstName} {a.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("Description")} *</Label>
                  <Input data-testid="input-payment-description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Amount")} *</Label>
                    <Input type="number" step="0.01" data-testid="input-payment-amount" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("Currency")}</Label>
                    <Select value={form.currency} onValueChange={v => setForm(f => ({ ...f, currency: v }))}>
                      <SelectTrigger data-testid="select-currency"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="RUB">RUB</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t("DueDate")}</Label>
                  <Input type="date" data-testid="input-due-date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Notes")}</Label>
                  <Textarea data-testid="input-payment-notes" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
                  <Button type="submit" data-testid="button-submit-payment" disabled={createPayment.isPending}>{t("Save")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Всего
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalAmount?.toFixed(0) ?? 0}</div>
              <p className="text-xs text-muted-foreground">RUB</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                {t("Paid")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary?.paidCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">{summary?.paidAmount?.toFixed(0) ?? 0} RUB</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600" />
                {t("Pending")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{summary?.pendingCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">{summary?.pendingAmount?.toFixed(0) ?? 0} RUB</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                {t("Overdue")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{summary?.overdueCount ?? 0}</div>
              <p className="text-xs text-muted-foreground">{summary?.overdueAmount?.toFixed(0) ?? 0} RUB</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2">
          {["all", "pending", "paid", "overdue"].map(s => (
            <Button
              key={s}
              size="sm"
              variant={statusFilter === s ? "default" : "outline"}
              onClick={() => setStatusFilter(s)}
              data-testid={`filter-payment-${s}`}
            >
              {s === "all" ? "Все" : t(s.charAt(0).toUpperCase() + s.slice(1) as any)}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-14" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed">
            <CreditCard className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">{t("NoData")}</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Спортсмен</TableHead>
                  <TableHead>{t("Description")}</TableHead>
                  <TableHead>{t("Amount")}</TableHead>
                  <TableHead>{t("DueDate")}</TableHead>
                  <TableHead>{t("Status")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id} data-testid={`row-payment-${p.id}`}>
                    <TableCell className="font-medium">
                      {(p as any).athlete
                        ? `${(p as any).athlete.firstName} ${(p as any).athlete.lastName}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.description}</TableCell>
                    <TableCell className="font-semibold">{p.amount} {p.currency}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.dueDate ? new Date(p.dueDate).toLocaleDateString("ru-RU") : "—"}
                    </TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {p.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMarkPaid(p.id)}
                            disabled={updatePayment.isPending}
                            data-testid={`button-mark-paid-${p.id}`}
                          >
                            {t("MarkPaid")}
                          </Button>
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              data-testid={`btn-delete-payment-${p.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить платёж?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Удалить запись «{p.description}» на сумму {p.amount} {p.currency}? Это действие нельзя отменить.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => handleDelete(p.id)}
                                disabled={deletePayment.isPending}
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Layout>
  );
}

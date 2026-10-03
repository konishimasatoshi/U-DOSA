"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NOTE_MAX_LENGTH } from "@/lib/constants";
import { parseManualInput, type PoopEvent } from "@/lib/events";
import { createManualEvent } from "@/lib/events-api";
import { toDateKey, toTimeValue } from "@/lib/format";

// 外出中など、警報器がいない場所でのうんちを手で追加するダイアログ。
// 日時は開いたときの現在時刻を初期値にする。
export function AddEventDialog({
  onCreated,
}: {
  onCreated: (event: PoopEvent) => void;
}) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleOpenChange(next: boolean) {
    if (next) {
      const now = new Date();
      setDate(toDateKey(now));
      setTime(toTimeValue(now));
      setNote("");
      setError(null);
    }
    setOpen(next);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const parsed = parseManualInput({ date, time, note });
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      onCreated(await createManualEvent(parsed));
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "記録の追加に失敗しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" className="w-full sm:w-auto">
          <Plus aria-hidden="true" />
          外出中の記録を追加
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>外出中の記録を追加</DialogTitle>
          <DialogDescription>
            警報器のない場所でのうんちを記録します。
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="event-date">日付</Label>
              <Input
                id="event-date"
                type="date"
                value={date}
                max={toDateKey(new Date())}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="event-time">時刻</Label>
              <Input
                id="event-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-note">
              メモ<span className="font-normal text-gray-600">(任意)</span>
            </Label>
            <Input
              id="event-note"
              value={note}
              maxLength={NOTE_MAX_LENGTH}
              placeholder="例: 保育園で。少しゆるめ"
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <LoaderCircle
                  className="animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
              )}
              {submitting ? "追加しています" : "追加する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

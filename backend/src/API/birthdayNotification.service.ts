import { Job, scheduleJob } from 'node-schedule';
import { readJSONFile, saveInAFile } from '../utils';
import { MailService } from './mail.service';
import { FcmNotificationService } from './fcmNotification.service';
import { SupabaseNotificationService } from './supabaseNotification.service';

const pathBirthdaysFile = 'data/birthdays.json';

export interface Birthday {
  name:         string;
  day:          number;   // 1–31
  month:        number;   // 1–12
  year?:        number;   // optional birth year (used to calculate age)
  reminderHour: number;   // 0–23
}

export class BirthdayService {
  static Instance: BirthdayService;

  private birthdays:    Birthday[] = [];
  private scheduleJobs: Job[]      = [];

  constructor() {
    BirthdayService.Instance = this;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private sendEmail = (message: string): void => {
    MailService.Instance?.sendMessageByEmail(message.substring(0, 50), message);
  };

  private sendToFcm = (message: string): void => {
    try { FcmNotificationService.Instance?.sendAlert(message); } catch (_) {}
  };

  private sendToSupabase = (message: string): void => {
    try { SupabaseNotificationService.Instance?.insertAlert(message, false); } catch (_) {}
  };

  private buildMessage = (birthday: Birthday): string => {
    if (birthday.year) {
      const age = new Date().getFullYear() - birthday.year;
      return `🎂 ¡Hoy es el cumpleaños de ${birthday.name}! ${age} años`;
    }
    return `🎂 ¡Hoy es el cumpleaños de ${birthday.name}!`;
  };

  private cancelAll = (): void => {
    this.scheduleJobs.forEach(job => job?.cancel());
    this.scheduleJobs = [];
  };

  private scheduleOne = (birthday: Birthday, sendMessage: (msg: string) => void): void => {
    // Fires every year at the specified hour:  0 {hour} {day} {month} *
    const cronExpr = `0 ${birthday.reminderHour} ${birthday.day} ${birthday.month} *`;
    const jobName  = `birthday_${birthday.name}_${birthday.day}_${birthday.month}`;
    const job = scheduleJob(jobName, cronExpr, () => {
      const msg = this.buildMessage(birthday);
      sendMessage(msg);
      // this.sendEmail(msg);
      this.sendToFcm(msg);
      this.sendToSupabase(msg);
    });
    if (job) this.scheduleJobs.push(job);
  };

  // ─── Public API ────────────────────────────────────────────────────────────

  loadAndSchedule = async (sendMessage: (msg: string) => void): Promise<Birthday[]> => {
    const raw = await readJSONFile(pathBirthdaysFile, '[]');
    this.birthdays = Array.isArray(raw) ? raw : [];
    this.cancelAll();
    this.birthdays.forEach(b => this.scheduleOne(b, sendMessage));
    console.log(`> ${this.birthdays.length} birthday reminder(s) scheduled.`);
    return this.birthdays;
  };

  getBirthdays = async (sendMessage: (msg: string) => void): Promise<Birthday[]> => {
    if (this.birthdays.length > 0) return this.birthdays;
    return this.loadAndSchedule(sendMessage);
  };

  updateBirthdays = async (
    birthdays:   Birthday[],
    sendMessage: (msg: string) => void,
  ): Promise<Birthday[]> => {
    this.birthdays = birthdays;
    this.cancelAll();
    this.birthdays.forEach(b => this.scheduleOne(b, sendMessage));
    saveInAFile(JSON.stringify(this.birthdays, null, 2), pathBirthdaysFile);
    console.log('> Birthdays saved!');
    return this.birthdays;
  };

  fileContent    = (): Birthday[] => this.birthdays;

  setFileContent = async (data: Birthday[]): Promise<void> => {
    this.birthdays = Array.isArray(data) ? data : [];
    saveInAFile(JSON.stringify(this.birthdays, null, 2), pathBirthdaysFile);
  };
}

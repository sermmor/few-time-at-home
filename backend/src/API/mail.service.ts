import { createTransport } from 'nodemailer';
import { EmailData } from "./email-data/email-data.interface";

// If you have doubts about how to use nodemailer, there is a simple tutorial at https://mailtrap.io/blog/nodemailer-gmail/
export class MailService {
  static Instance: MailService;

  constructor(private data: EmailData) {
    MailService.Instance = this;
  }

  sendBackupZipFile = (backupPath: string) => {
    const currentDate = new Date();
    const nameFolderDate = `${currentDate.getUTCDate()} - ${currentDate.getUTCMonth()} - ${currentDate.getUTCFullYear()}, ${currentDate.getUTCHours()}:${currentDate.getUTCMinutes()}`;

    const transporter = createTransport({
      service: this.data.email_service,
      auth: {
        user: this.data.email_user,
        pass: this.data.email_pass,
      },
     });

     const mailOptions = {
      from: this.data.email_user,
      to: this.data.email_user,
      subject: `${this.data.email_prelude}A new Few_Time@Home backup at ${nameFolderDate}`,
      text: "Here comes the backup of today. Have a nice day! :D",
      attachments: [
        {
          path: backupPath,
        },
      ],
     };

     transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error(`Error sending backup email ${error}`);
      } else {
        console.log(`Email sent: ${info.response}`);
      }
     });
  };
}
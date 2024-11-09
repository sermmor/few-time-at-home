export interface EmailData {
  email_service: string,
  email_user: string,
  email_pass: string;
  email_prelude: string;
}

export const extractEmailData = (data: any): EmailData => ({
  email_service: data.email_service,
  email_user: data.email_user,
  email_pass: data.email_pass,
  email_prelude: data.email_prelude,
});

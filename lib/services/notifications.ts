import {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  type Prisma,
} from "@prisma/client";
import { Resend } from "resend";
import twilio, { type Twilio } from "twilio";

import { prisma } from "@/lib/prisma";

export interface TemplateVariables {
  borrowerName?: string;
  title?: string;
  author?: string;
  dueDate?: string;
  newDueDate?: string;
  libraryName?: string;
  replacementValue?: string;
  repairCost?: string;
  loanId?: string;
  returnDate?: string;
  [key: string]: string | undefined;
}

export interface SendNotificationResult {
  status: NotificationStatus;
  errorMsg?: string;
  sentAt?: Date;
  logId: string;
}

function getTwilioPhoneNumber(): string | undefined {
  return (
    process.env.TWILIO_PHONE_NUMBER ??
    process.env.TWILIO_VOICE_PHONE_NUMBER
  );
}

function getTwilioClient(): Twilio | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  if (!accountSid) return null;

  if (process.env.TWILIO_AUTH_TOKEN) {
    return twilio(accountSid, process.env.TWILIO_AUTH_TOKEN);
  }

  if (process.env.TWILIO_API_KEY_SID && process.env.TWILIO_API_KEY_SECRET) {
    return twilio(
      process.env.TWILIO_API_KEY_SID,
      process.env.TWILIO_API_KEY_SECRET,
      { accountSid }
    );
  }

  return null;
}

function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

function isTwilioConfigured(): boolean {
  return Boolean(getTwilioClient() && getTwilioPhoneNumber());
}

export function substituteTemplateVariables(
  template: string,
  variables: TemplateVariables
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

export async function getNotificationTemplate(
  organizationId: string,
  type: NotificationType
) {
  return prisma.notificationTemplate.findUnique({
    where: { organizationId_type: { organizationId, type } },
  });
}

export async function renderNotificationContent(
  organizationId: string,
  type: NotificationType,
  variables: TemplateVariables
): Promise<{ subject: string; body: string }> {
  const template = await getNotificationTemplate(organizationId, type);

  if (!template) {
    return {
      subject: type.replace(/_/g, " "),
      body: Object.entries(variables)
        .map(([key, value]) => `${key}: ${value ?? ""}`)
        .join("\n"),
    };
  }

  return {
    subject: substituteTemplateVariables(template.subject, variables),
    body: substituteTemplateVariables(template.body, variables),
  };
}

async function createNotificationLog(data: {
  organizationId: string;
  loanId?: string | null;
  type: NotificationType;
  channel: NotificationChannel;
  recipient: string;
  subject?: string | null;
  message: string;
  status: NotificationStatus;
  errorMsg?: string | null;
  sentAt?: Date | null;
}) {
  return prisma.notificationLog.create({
    data: {
      organizationId: data.organizationId,
      loanId: data.loanId ?? null,
      type: data.type,
      channel: data.channel,
      recipient: data.recipient,
      subject: data.subject ?? null,
      message: data.message,
      status: data.status,
      errorMsg: data.errorMsg ?? null,
      sentAt: data.sentAt ?? null,
    },
  });
}

export async function sendEmail(params: {
  organizationId: string;
  to: string;
  type: NotificationType;
  variables: TemplateVariables;
  loanId?: string | null;
}): Promise<SendNotificationResult> {
  const { subject, body } = await renderNotificationContent(
    params.organizationId,
    params.type,
    params.variables
  );

  if (!isResendConfigured()) {
    const log = await createNotificationLog({
      organizationId: params.organizationId,
      loanId: params.loanId,
      type: params.type,
      channel: NotificationChannel.EMAIL,
      recipient: params.to,
      subject,
      message: body,
      status: NotificationStatus.NOT_CONFIGURED,
      errorMsg: "RESEND_API_KEY is not configured",
    });

    return { status: NotificationStatus.NOT_CONFIGURED, logId: log.id };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const from =
      process.env.RESEND_FROM_EMAIL ?? "LibraryInventory <dmv@tagsclinic.com>";

    await resend.emails.send({
      from,
      to: params.to,
      subject,
      text: body,
    });

    const sentAt = new Date();
    const log = await createNotificationLog({
      organizationId: params.organizationId,
      loanId: params.loanId,
      type: params.type,
      channel: NotificationChannel.EMAIL,
      recipient: params.to,
      subject,
      message: body,
      status: NotificationStatus.SENT,
      sentAt,
    });

    return { status: NotificationStatus.SENT, sentAt, logId: log.id };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Failed to send email";

    const log = await createNotificationLog({
      organizationId: params.organizationId,
      loanId: params.loanId,
      type: params.type,
      channel: NotificationChannel.EMAIL,
      recipient: params.to,
      subject,
      message: body,
      status: NotificationStatus.FAILED,
      errorMsg,
    });

    return { status: NotificationStatus.FAILED, errorMsg, logId: log.id };
  }
}

export async function sendSMS(params: {
  organizationId: string;
  to: string;
  type: NotificationType;
  variables: TemplateVariables;
  loanId?: string | null;
}): Promise<SendNotificationResult> {
  const { body } = await renderNotificationContent(
    params.organizationId,
    params.type,
    params.variables
  );

  const client = getTwilioClient();
  const fromNumber = getTwilioPhoneNumber();

  if (!client || !fromNumber) {
    const log = await createNotificationLog({
      organizationId: params.organizationId,
      loanId: params.loanId,
      type: params.type,
      channel: NotificationChannel.SMS,
      recipient: params.to,
      message: body,
      status: NotificationStatus.NOT_CONFIGURED,
      errorMsg: "Twilio credentials or phone number are not configured",
    });

    return { status: NotificationStatus.NOT_CONFIGURED, logId: log.id };
  }

  try {
    await client.messages.create({
      body,
      from: fromNumber,
      to: params.to,
    });

    const sentAt = new Date();
    const log = await createNotificationLog({
      organizationId: params.organizationId,
      loanId: params.loanId,
      type: params.type,
      channel: NotificationChannel.SMS,
      recipient: params.to,
      message: body,
      status: NotificationStatus.SENT,
      sentAt,
    });

    return { status: NotificationStatus.SENT, sentAt, logId: log.id };
  } catch (error) {
    const errorMsg =
      error instanceof Error ? error.message : "Failed to send SMS";

    const log = await createNotificationLog({
      organizationId: params.organizationId,
      loanId: params.loanId,
      type: params.type,
      channel: NotificationChannel.SMS,
      recipient: params.to,
      message: body,
      status: NotificationStatus.FAILED,
      errorMsg,
    });

    return { status: NotificationStatus.FAILED, errorMsg, logId: log.id };
  }
}

export async function sendNotification(params: {
  organizationId: string;
  channel: NotificationChannel;
  recipient: string;
  type: NotificationType;
  variables: TemplateVariables;
  loanId?: string | null;
}): Promise<SendNotificationResult> {
  if (params.channel === NotificationChannel.EMAIL) {
    return sendEmail({
      organizationId: params.organizationId,
      to: params.recipient,
      type: params.type,
      variables: params.variables,
      loanId: params.loanId,
    });
  }

  return sendSMS({
    organizationId: params.organizationId,
    to: params.recipient,
    type: params.type,
    variables: params.variables,
    loanId: params.loanId,
  });
}

export type NotificationLogWithLoan = Prisma.NotificationLogGetPayload<{
  include: { loan: { include: { book: true; borrower: true } } };
}>;

export function getNotificationProviderStatus() {
  return {
    email: isResendConfigured()
      ? {
          configured: true,
          from: process.env.RESEND_FROM_EMAIL ?? "dmv@tagsclinic.com",
        }
      : { configured: false },
    sms: isTwilioConfigured()
      ? {
          configured: true,
          from: getTwilioPhoneNumber() ?? "+18169004121",
        }
      : { configured: false },
  };
}

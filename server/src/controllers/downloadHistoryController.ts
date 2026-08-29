import type { Request, Response } from "express";
import { downloadHistoryService } from "@/services/downloadHistoryService";
import type { DownloadSort } from "@/repositories/downloadHistoryRepository";
import type { DownloadType } from "@prisma/client";

export const downloadHistoryController = {
  async list(req: Request, res: Response): Promise<void> {
    const {
      page,
      pageSize,
      sessionId,
      clientId,
      search,
      downloadType,
      from,
      to,
      sort,
      activityDays
    } = req.query as {
      page?: string | number;
      pageSize?: string | number;
      sessionId?: string;
      clientId?: string;
      search?: string;
      downloadType?: DownloadType;
      from?: string;
      to?: string;
      sort?: DownloadSort;
      activityDays?: string | number;
    };

    const result = await downloadHistoryService.list({
      page: page as number | undefined,
      pageSize: pageSize as number | undefined,
      sessionId,
      clientId,
      search,
      downloadType,
      // `to` is an inclusive day bound, so extend it to the end of that day.
      from: from ? new Date(from) : undefined,
      to: to ? new Date(`${to.slice(0, 10)}T23:59:59.999Z`) : undefined,
      sort,
      activityDays: activityDays as number | undefined
    });
    res.status(200).json(result);
  }
};

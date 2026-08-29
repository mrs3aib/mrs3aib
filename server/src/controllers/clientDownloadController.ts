import type { Request, Response } from "express";
import { downloadService } from "@/services/downloadService";
import { getClientIp } from "@/utils/requestIp";
import { UnauthorizedError } from "@/types/errors";
import { requireClientSessionId } from "@/utils/clientSession";
import { logger } from "@/config/logger";

export const clientDownloadController = {
  async downloadSingle(req: Request, res: Response): Promise<void> {
    if (req.auth?.role !== "client") throw new UnauthorizedError();
    const sessionId = requireClientSessionId(req);
    const url = await downloadService.downloadSingle({
      sessionId,
      clientId: req.auth.clientId,
      mediaId: req.params.mediaId as string,
      ipAddress: getClientIp(req)
    });
    logger.info({ clientId: req.auth.clientId, mediaId: req.params.mediaId }, "Single download");
    res.status(200).json({ url });
  },

  async downloadMultiple(req: Request, res: Response): Promise<void> {
    if (req.auth?.role !== "client") throw new UnauthorizedError();
    const sessionId = requireClientSessionId(req);
    const { mediaIds } = req.body as { mediaIds: string[] };
    const results = await downloadService.downloadMultiple({
      sessionId,
      clientId: req.auth.clientId,
      mediaIds,
      ipAddress: getClientIp(req)
    });
    logger.info(
      { clientId: req.auth.clientId, count: mediaIds.length },
      "Multiple download"
    );
    res.status(200).json({ files: results });
  },

  async downloadSelection(req: Request, res: Response): Promise<void> {
    if (req.auth?.role !== "client") throw new UnauthorizedError();
    const sessionId = requireClientSessionId(req);
    const { mediaIds } = req.body as { mediaIds: string[] };
    const url = await downloadService.downloadSelectionZip({
      sessionId,
      clientId: req.auth.clientId,
      mediaIds,
      ipAddress: getClientIp(req)
    });
    logger.info(
      { clientId: req.auth.clientId, count: mediaIds.length },
      "Selection ZIP download"
    );
    res.status(200).json({ url });
  },

  async downloadSession(req: Request, res: Response): Promise<void> {
    if (req.auth?.role !== "client") throw new UnauthorizedError();
    const sessionId = requireClientSessionId(req);
    const url = await downloadService.downloadSession({
      sessionId,
      clientId: req.auth.clientId,
      ipAddress: getClientIp(req)
    });
    logger.info({ clientId: req.auth.clientId }, "Session ZIP download");
    res.status(200).json({ url });
  }
};

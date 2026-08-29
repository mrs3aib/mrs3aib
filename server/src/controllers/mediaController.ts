import type { Request, Response } from "express";
import { mediaService } from "@/services/mediaService";
import type { MediaSort } from "@/repositories/mediaRepository";
import type { MediaProcessingStatus, MediaType } from "@prisma/client";

export const mediaController = {
  async list(req: Request, res: Response): Promise<void> {
    const { sessionId, page, pageSize, type, search, processingStatus, sort } =
      req.query as {
        sessionId?: string;
        page?: string | number;
        pageSize?: string | number;
        type?: MediaType;
        search?: string;
        processingStatus?: MediaProcessingStatus;
        sort?: MediaSort;
      };
    const result = await mediaService.list({
      sessionId,
      page: page as number | undefined,
      pageSize: pageSize as number | undefined,
      type,
      search,
      processingStatus,
      sort
    });
    res.status(200).json(result);
  },

  async requestUploadUrl(req: Request, res: Response): Promise<void> {
    const result = await mediaService.requestUploadUrl(req.body);
    res.status(200).json(result);
  },

  async addYouTubeLink(req: Request, res: Response): Promise<void> {
    const media = await mediaService.addYouTubeLink(req.body);
    res.status(201).json(media);
  },

  async confirmUpload(req: Request, res: Response): Promise<void> {
    const media = await mediaService.confirmUpload(req.params.id as string);
    res.status(200).json(media);
  },

  async delete(req: Request, res: Response): Promise<void> {
    await mediaService.delete(req.params.id as string);
    res.status(204).send();
  }
};

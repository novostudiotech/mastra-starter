import { getLocalAgents } from '@ag-ui/mastra';
import {
  CopilotRuntime,
  copilotRuntimeNestEndpoint,
  ExperimentalEmptyAdapter,
} from '@copilotkit/runtime';
import { All, Controller, Req, Res } from '@nestjs/common';
import { Public } from '@thallesp/nestjs-better-auth';
import type { Request, Response } from 'express';
import { MastraService } from './mastra.service';

@Controller('api/copilotkit')
@Public()
export class MastraController {
  private handler: ReturnType<typeof copilotRuntimeNestEndpoint> | null = null;

  constructor(private readonly mastraService: MastraService) {}

  private getHandler() {
    if (!this.handler) {
      const mastra = this.mastraService.getMastra();
      const agents = getLocalAgents({
        mastra,
        resourceId: 'default',
      });

      const runtime = new CopilotRuntime({
        agents,
      });

      this.handler = copilotRuntimeNestEndpoint({
        runtime,
        serviceAdapter: new ExperimentalEmptyAdapter(),
        endpoint: '/api/copilotkit',
      });
    }
    return this.handler;
  }

  @All()
  async handleCopilotKitRoot(@Req() req: Request, @Res() res: Response) {
    const handler = this.getHandler();
    return handler(req, res);
  }

  @All('*path')
  async handleCopilotKit(@Req() req: Request, @Res() res: Response) {
    const handler = this.getHandler();
    return handler(req, res);
  }
}

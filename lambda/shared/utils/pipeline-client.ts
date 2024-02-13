import {
  CodePipelineClient,
  StartPipelineExecutionCommand,
  StartPipelineExecutionCommandInput,
} from '@aws-sdk/client-codepipeline';

export class AppPipelineClient {
  private client: CodePipelineClient;

  constructor() {
    this.client = new CodePipelineClient();
  }

  async startPipeline(props: { pipelineName: string }): Promise<string> {
    const input: StartPipelineExecutionCommandInput = {
      name: props.pipelineName,
    };

    const res = await this.client.send(new StartPipelineExecutionCommand(input));

    return res.pipelineExecutionId ?? '';
  }
}

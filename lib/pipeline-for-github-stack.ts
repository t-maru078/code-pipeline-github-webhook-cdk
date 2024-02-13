import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GithubApp } from './constructs/github-app';
import { PipelineEventHandler } from './constructs/pipeline-event-handler';
import { DataStore } from './constructs/data-store';
import { AppPipeline } from './constructs/pipeline';

export class PipelineForGithub extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const githubOwner = this.node.getContext('GITHUB_OWNER');
    const githubRepo = this.node.getContext('GITHUB_REPO');
    const githubAppId = this.node.getContext('GITHUB_APP_ID');
    const githubAppInstallationId = this.node.getContext('GITHUB_APP_INSTALLATION_ID');
    const githubAppInfoSecretName = this.node.getContext('GITHUB_APP_INFO_SECRET_NAME');

    if (!githubOwner || !githubRepo || !githubAppId || !githubAppInstallationId || !githubAppInfoSecretName) {
      throw new Error('missing context');
    }

    const dataStore = new DataStore(this, 'DataStore');

    const githubApp = new GithubApp(this, 'GithubApp', {
      githubAppId,
      githubAppInfoSecretName,
      buildHistoryTable: dataStore.buildHistoryTable,
    });

    const appPipeline = new AppPipeline(this, 'AppPipeline', {
      buildHistoryTable: dataStore.buildHistoryTable,
      sourceCodeStoreBucket: dataStore.sourceCodeStoreBucket,
    });

    new PipelineEventHandler(this, 'PipelineEventHandler', {
      githubOwner: githubOwner,
      githubRepo: githubRepo,
      githubAppInstallationId,
      githubAppFunctionUrl: githubApp.githubAppFuncUrl,
      sourceCodeStoreBucket: dataStore.sourceCodeStoreBucket,
      buildHistoryTable: dataStore.buildHistoryTable,
      ciPipeline: appPipeline.ciPipeline,
    });
  }
}

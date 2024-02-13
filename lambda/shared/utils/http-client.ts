import { Sha256 } from '@aws-crypto/sha256-universal';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import axios from 'axios';

export class AppHttpClient {
  constructor(private params: { awsRegion: string }) {}

  async postWithAwsSignV4(params: { url: string; body: any }): Promise<{ status: number; body: any }> {
    const url = new URL(params.url);

    const signV4 = new SignatureV4({
      service: 'lambda',
      region: this.params.awsRegion,
      credentials: defaultProvider(),
      sha256: Sha256,
    });

    const req = new HttpRequest({
      headers: {
        'content-type': 'application/json',
        host: url.hostname,
      },
      hostname: url.hostname,
      method: 'POST',
      path: url.pathname,
      body: JSON.stringify(params.body),
    });

    const signedReq = await signV4.sign(req);

    console.log(`signedReq の生成完了, $${JSON.stringify(signedReq, null, 2)}`);

    const axiosResult = await axios.post(params.url, signedReq.body, {
      headers: signedReq.headers,
    });

    return {
      status: axiosResult.status,
      body: axiosResult.data,
    };
  }
}

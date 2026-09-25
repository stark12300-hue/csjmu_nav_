import app from '../src/serverApp';

export default function handler(req: any, res: any) {
  return app(req, res);
}

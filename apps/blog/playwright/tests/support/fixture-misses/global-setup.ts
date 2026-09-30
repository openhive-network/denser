import { resetMissShards } from './miss-log';

export default function globalSetup(): void {
  resetMissShards();
}

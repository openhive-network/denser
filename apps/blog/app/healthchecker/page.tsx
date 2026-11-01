import { getApiSetSnapshot } from '@transaction/lib/api-sets/router';
import HealthCheckersWrapper from '@/blog/components/healthcheckers-wrapper';

// The server engine's node health, so the page shows (and the browser routes by) the server's view.
const Healthchecker = () => <HealthCheckersWrapper snapshot={getApiSetSnapshot() ?? null} />;

export default Healthchecker;

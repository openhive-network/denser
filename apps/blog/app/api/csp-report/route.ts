import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@hive/ui/lib/logging';

const logger = getLogger('csp');

/**
 * CSP violation report structure as defined by the W3C CSP specification.
 * @see https://www.w3.org/TR/CSP3/#violation-events
 */
interface CspViolationReport {
  'csp-report': {
    'document-uri'?: string;
    'referrer'?: string;
    'violated-directive'?: string;
    'effective-directive'?: string;
    'original-policy'?: string;
    'disposition'?: 'enforce' | 'report';
    'blocked-uri'?: string;
    'line-number'?: number;
    'column-number'?: number;
    'source-file'?: string;
    'status-code'?: number;
    'script-sample'?: string;
  };
}

/**
 * Validates that the payload is a valid CSP violation report.
 */
function isValidCspReport(payload: unknown): payload is CspViolationReport {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const report = payload as Record<string, unknown>;

  // CSP reports must have a 'csp-report' property
  if (!('csp-report' in report) || typeof report['csp-report'] !== 'object') {
    return false;
  }

  return true;
}

/**
 * Handles CSP violation reports sent by browsers.
 *
 * This endpoint receives reports when Content-Security-Policy or
 * Content-Security-Policy-Report-Only headers include a report-uri directive.
 *
 * Reports are logged for monitoring and CSP policy refinement.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    // CSP reports may be sent with content-type: application/csp-report
    // or application/json depending on the browser
    const body = await req.json().catch(() => null);

    if (!isValidCspReport(body)) {
      logger.debug('Received invalid CSP report format');
      return new NextResponse(null, { status: 400 });
    }

    const report = body['csp-report'];

    // Log the violation with relevant fields for analysis
    logger.warn(
      {
        blockedUri: report['blocked-uri'],
        violatedDirective: report['violated-directive'],
        effectiveDirective: report['effective-directive'],
        documentUri: report['document-uri'],
        sourceFile: report['source-file'],
        lineNumber: report['line-number'],
        disposition: report['disposition'],
      },
      'CSP violation: %s blocked by %s',
      report['blocked-uri'] || 'unknown',
      report['violated-directive'] || 'unknown'
    );

    // Return 204 No Content as per common practice for report endpoints
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    logger.error(error, 'Error processing CSP report');
    return new NextResponse(null, { status: 500 });
  }
}

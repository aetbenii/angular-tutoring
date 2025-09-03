import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BUILD_INFO } from '../build-info.generated.js';
import { Observable, of, timer } from 'rxjs';
import { catchError, map, shareReplay, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface BuildInfo {
  version: string;
  buildNumber?: string;
  buildDate?: string;
  branch?: string;
  commit?: string;
  tag?: string;
  environment: string;
  angularVersion?: string;
}

export interface BackendStatus {
  name: string;
  version: string;
  profile: string;
  timestamp: string;
  build: {
    number: string;
    javaVersion: string;
    time: string;
  };
  git: {
    dirty: boolean;
    commitMessage: string;
    commitTime: string;
    commitIdFull: string;
    commitId: string;
    branch: string;
    tags: string;
  };
  runtime: {
    uptimeMillis: number;
    javaVersion: string;
    jvmVersion: string;
    jvmName: string;
    startTime: string;
    javaVendor: string;
    uptime: string;
  };
  memory: {
    heap: {
      committed: string;
      max: string;
      usagePercent: number;
      used: string;
    };
    nonHeap: {
      committed: string;
      max: string;
      used: string;
    };
  };
  health: {
    roleManager?: {
      mockMode: boolean;
      baseUrl: string;
      status: string;
    };
    database?: {
      type: string;
      employeeCount: number;
      status: string;
    };
    status: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class VersionService {
  private readonly apiUrl = environment.apiBaseUrl;
  private backendStatus$: Observable<BackendStatus | null>;
  private buildInfo$: Observable<BuildInfo>;
  
  constructor(private http: HttpClient) {
    // Load build info once and cache it
    this.buildInfo$ = this.loadBuildInfo().pipe(
      shareReplay(1)
    );
    
    // Poll backend status every 30 seconds
    this.backendStatus$ = timer(0, 30000).pipe(
      switchMap(() => this.fetchBackendStatus()),
      shareReplay(1)
    );
  }

  /**
   * Get build information (version, build date, etc.)
   */
  getBuildInfo(): Observable<BuildInfo> {
    return this.buildInfo$;
  }

  /**
   * Get backend status information
   */
  getBackendStatus(): Observable<BackendStatus | null> {
    return this.backendStatus$;
  }

  /**
   * Force refresh backend status
   */
  refreshBackendStatus(): Observable<BackendStatus | null> {
    return this.fetchBackendStatus();
  }

  private loadBuildInfo(): Observable<BuildInfo> {
    // Return compile-time generated build info only (no HTTP request)
    const compiled: BuildInfo = {
      version: BUILD_INFO.version,
      buildNumber: BUILD_INFO.buildNumber,
      buildDate: BUILD_INFO.buildDate,
      branch: BUILD_INFO.branch,
      commit: BUILD_INFO.commit,
      tag: BUILD_INFO.tag,
      environment: BUILD_INFO.environment,
      angularVersion: BUILD_INFO.angularVersion
    };
    return of(compiled);
  }

  private fetchBackendStatus(): Observable<BackendStatus | null> {
    return this.http.get<BackendStatus>(`${this.apiUrl}/status`).pipe(
      catchError(error => {
        console.error('Failed to fetch backend status:', error);
        return of(null);
      })
    );
  }

  /**
   * Check if backend is healthy
   */
  isBackendHealthy(): Observable<boolean> {
    return this.backendStatus$.pipe(
      map(status => status?.health?.status === 'UP')
    );
  }

  /**
   * Get backend version string
   */
  getBackendVersion(): Observable<string | null> {
    return this.backendStatus$.pipe(
      map(status => {
        if (!status) return null;
        return `${status.version} (Build: ${status.build.number})`;
      })
    );
  }

  /**
   * Get formatted uptime
   */
  getBackendUptime(): Observable<string | null> {
    return this.backendStatus$.pipe(
      map(status => status?.runtime?.uptime || null)
    );
  }
}
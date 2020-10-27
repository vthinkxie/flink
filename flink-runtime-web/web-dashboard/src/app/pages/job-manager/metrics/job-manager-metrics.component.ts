/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { JobManagerService, StatusService } from 'services';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'flink-job-manager-metrics',
  templateUrl: './job-manager-metrics.component.html',
  styleUrls: ['./job-manager-metrics.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobManagerMetricsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject();
  metrics: { [id: string]: number } = {};
  config: { [id: string]: string } = {};
  constructor(
    private jobManagerService: JobManagerService,
    private statusService: StatusService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.jobManagerService.loadConfig().subscribe(data => {
      for (const item of data) {
        this.config[item.key] = item.value;
      }
      console.log(this.config);
      this.cdr.markForCheck();
    });
    this.statusService.refresh$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.jobManagerService
        .getMetrics([
          'Status.JVM.Memory.Heap.Used',
          'Status.JVM.Memory.Heap.Max',
          'Status.JVM.Memory.Metaspace.Used',
          'Status.JVM.Memory.Metaspace.Max'
        ])
        .subscribe(data => {
          this.metrics = data;
          this.cdr.markForCheck();
        });
    });
  }
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

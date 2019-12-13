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

import { Component, OnInit, ChangeDetectionStrategy, OnDestroy, ChangeDetectorRef, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, flatMap, takeUntil } from 'rxjs/operators';
import { deepFind } from 'utils';
import { JobSubTaskInterface } from 'interfaces';
import { JobService } from 'services';

@Component({
  selector: 'flink-job-overview-drawer-attempts',
  templateUrl: './job-overview-drawer-attempts.component.html',
  styleUrls: ['./job-overview-drawer-attempts.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobOverviewDrawerAttemptsComponent implements OnInit, OnDestroy {
  @Input() subtaskId: number;
  listOfTask: JobSubTaskInterface[] = [];
  destroy$ = new Subject();
  sortName: string;
  sortValue: string;
  isLoading = true;

  trackTaskBy(_: number, node: JobSubTaskInterface) {
    return node.attempt;
  }

  sort(sort: { key: string; value: string }) {
    this.sortName = sort.key;
    this.sortValue = sort.value;
    this.search();
  }

  search() {
    if (this.sortName) {
      this.listOfTask = [
        ...this.listOfTask.sort((pre, next) => {
          if (this.sortValue === 'ascend') {
            return deepFind(pre, this.sortName) > deepFind(next, this.sortName) ? 1 : -1;
          } else {
            return deepFind(next, this.sortName) > deepFind(pre, this.sortName) ? 1 : -1;
          }
        })
      ];
    }
  }
  constructor(private jobService: JobService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.jobService.jobWithVertex$
      .pipe(
        debounceTime(100),
        takeUntil(this.destroy$),
        flatMap(data => this.jobService.loadSubTaskAttempts(data.job.jid, data.vertex!.id, this.subtaskId))
      )
      .subscribe(
        data => {
          this.listOfTask = data;
          this.isLoading = false;
          this.search();
          this.cdr.markForCheck();
        },
        () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      );
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

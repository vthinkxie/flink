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

import { formatDate } from '@angular/common';
import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { JobExceptionItemInterface } from 'interfaces';
import { distinctUntilChanged, flatMap } from 'rxjs/operators';
import { JobService } from 'services';

@Component({
  selector: 'flink-job-exceptions',
  templateUrl: './job-exceptions.component.html',
  styleUrls: ['./job-exceptions.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobExceptionsComponent implements OnInit {
  rootException = '';
  listOfException: JobExceptionItemInterface[] = [];
  truncated = false;
  isLoading = false;
  maxExceptions = 0;

  trackExceptionBy(_: number, node: JobExceptionItemInterface) {
    return node.timestamp;
  }
  loadMore() {
    this.isLoading = true;
    this.maxExceptions += 10;
    this.jobService.jobDetail$
      .pipe(
        distinctUntilChanged((pre, next) => pre.jid === next.jid),
        flatMap(job => this.jobService.loadExceptions(job.jid, this.maxExceptions))
      )
      .subscribe(
        data => {
          // @ts-ignore
          if (data['root-exception']) {
            this.rootException =
              formatDate(data.timestamp, 'yyyy-MM-dd HH:mm:ss', 'en') + '\n' + data['root-exception'];
          } else {
            this.rootException = 'No Root Exception';
          }
          this.truncated = data.truncated;
          this.listOfException = data['all-exceptions'];
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        () => {
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      );
  }

  constructor(private jobService: JobService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadMore();
  }
}

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

import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { JobPendingSlot } from 'interfaces';
import { distinctUntilChanged, flatMap } from 'rxjs/operators';
import { JobService } from 'services';

@Component({
  selector: 'flink-job-pending-slots',
  templateUrl: './job-pending-slots.component.html',
  styleUrls: ['./job-pending-slots.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobPendingSlotsComponent implements OnInit {
  listOfPendingSlots: JobPendingSlot[] = [];
  total = 0;
  trackByPendingSlots(_: number, node: JobPendingSlot) {
    return node.vertex_id;
  }
  constructor(private jobService: JobService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.jobService.jobDetail$
      .pipe(
        distinctUntilChanged((pre, next) => pre.jid === next.jid),
        flatMap(job => this.jobService.loadPendingSlots(job.jid))
      )
      .subscribe(
        data => {
          this.listOfPendingSlots = data['pending-slot-requests'];
          this.total = data.total;
          this.cdr.markForCheck();
        },
        () => {
          this.listOfPendingSlots = [];
          this.total = 0;
          this.cdr.markForCheck();
        }
      );
  }
}

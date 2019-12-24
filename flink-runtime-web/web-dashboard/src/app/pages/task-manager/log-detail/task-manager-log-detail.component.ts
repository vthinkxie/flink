/*
 *   Licensed to the Apache Software Foundation (ASF) under one
 *   or more contributor license agreements.  See the NOTICE file
 *   distributed with this work for additional information
 *   regarding copyright ownership.  The ASF licenses this file
 *   to you under the Apache License, Version 2.0 (the
 *   "License"); you may not use this file except in compliance
 *   with the License.  You may obtain a copy of the License at
 *       http://www.apache.org/licenses/LICENSE-2.0
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TaskManagerDetailInterface } from 'interfaces';
import { TaskManagerService } from 'services';
import { first } from 'rxjs/operators';

@Component({
  selector: 'flink-task-manager-log-detail',
  templateUrl: './task-manager-log-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrls: ['./task-manager-log-detail.component.less']
})
export class TaskManagerLogDetailComponent implements OnInit {
  logs = '';
  logName = '';
  downloadUrl = '';
  isLoading = false;
  taskManagerDetail: TaskManagerDetailInterface;

  constructor(
    private taskManagerService: TaskManagerService,
    private cdr: ChangeDetectorRef,
    private activatedRoute: ActivatedRoute
  ) {}

  reload() {
    this.isLoading = true;
    this.cdr.markForCheck();
    this.taskManagerService.loadLog(this.taskManagerDetail.id, this.logName).subscribe(
      data => {
        this.logs = data.data;
        this.downloadUrl = data.url;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      () => {
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    );
  }
  ngOnInit() {
    this.logName = this.activatedRoute.snapshot.params.logName;
    this.taskManagerService.taskManagerDetail$.pipe(first()).subscribe(data => {
      this.taskManagerDetail = data;
      this.reload();
    });
  }
}

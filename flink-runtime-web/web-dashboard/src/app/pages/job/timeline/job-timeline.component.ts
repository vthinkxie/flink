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

import {
  Component,
  ElementRef,
  OnDestroy,
  ChangeDetectionStrategy,
  ViewChild,
  ChangeDetectorRef,
  AfterViewInit
} from '@angular/core';
import { Chart } from '@antv/g2';
import * as G2 from '@antv/g2';
import { Subject } from 'rxjs';
import { distinctUntilChanged, filter, takeUntil } from 'rxjs/operators';
import {
  JobDetailCorrectInterface,
  JobSubTaskTimeAttemptInterface,
  JobSubTaskTimeSubTaskInterface,
  VerticesItemInterface,
  VerticesItemRangeInterface
} from 'interfaces';
import { JobService } from 'services';
import { COLOR_MAP } from 'config';

interface AttemptTimeline {
  name?: string;
  range?: number[];
  status: string;
  startTime: number;
  link: string;
  subtask: number;
  attempt: number;
}

@Component({
  selector: 'flink-job-timeline',
  templateUrl: './job-timeline.component.html',
  styleUrls: ['./job-timeline.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class JobTimelineComponent implements AfterViewInit, OnDestroy {
  destroy$ = new Subject();
  mainChartInstance: Chart;
  subTaskChartInstance: Chart;
  jobDetail: JobDetailCorrectInterface;
  selectedVertex: VerticesItemInterface;
  isShowSubTaskTimeLine = false;
  showAttempt = false;
  selectedSubTaskId = null;
  selectedAttemptId = null;
  listOfSubTaskId: number[] = [];
  listOfAttemptId: number[] = [];
  listOfSubTaskTimeLine: AttemptTimeline[] = [];
  listOfVertexData: JobSubTaskTimeSubTaskInterface[] = [];
  @ViewChild('mainTimeLine') mainTimeLine: ElementRef;
  @ViewChild('subTaskTimeLine') subTaskTimeLine: ElementRef;
  timeConfig = {
    range: {
      alias: 'Time',
      type: 'time',
      mask: 'MM-DD HH:mm:ss',
      nice: false
    }
  };

  heightCalc(count: number): number {
    return Math.max(count * 50 + 100, 150);
  }
  toggleAttemptTimeline(showAttempt: boolean) {
    this.showAttempt = showAttempt;
    this.updateSubTaskChart(this.selectedVertex.id, this.showAttempt);
  }

  updateSubTaskChart(vertexId: string, showAttempt = false) {
    this.listOfSubTaskTimeLine = [];
    this.listOfAttemptId = [];
    const listOfSubTaskTimeLine: AttemptTimeline[] = [];
    let timeLineCount = 0;
    this.selectedSubTaskId = null;
    this.jobService.loadSubTaskTimes(this.jobDetail.jid, vertexId).subscribe(data => {
      this.listOfSubTaskId = data.subtasks.map(item => item.subtask);
      this.listOfVertexData = data.subtasks;
      const countTimeline = (attempt: JobSubTaskTimeAttemptInterface, subtask: number) => {
        timeLineCount = timeLineCount + 1;
        const listOfTimeLine: AttemptTimeline[] = [];
        // @ts-ignore
        const link = `./#/task-manager/${attempt['taskmanager-id']}/log/taskmanager.log`;
        for (const key in attempt.timestamps) {
          // @ts-ignore
          const time = attempt.timestamps[key];
          if (time > 0) {
            listOfTimeLine.push({
              status: key,
              startTime: time,
              attempt: attempt['attempt-num'],
              subtask,
              link
            });
          }
        }
        listOfTimeLine.sort((pre, next) => pre.startTime - next.startTime);
        listOfTimeLine.forEach((item, index) => {
          const name = `Subtask-${attempt.subtask} | Host-${attempt.host} | Attempt-${attempt['attempt-num']}`;
          const href = item.link;
          const status = item.status;
          if (index === listOfTimeLine.length - 1) {
            let endTime = attempt.duration + listOfTimeLine[0].startTime;
            if (endTime < item.startTime) {
              endTime = item.startTime;
            }
            listOfSubTaskTimeLine.push({
              name,
              link: href,
              status,
              startTime: item.startTime,
              attempt: item.attempt,
              range: [item.startTime, endTime],
              subtask: item.subtask
            });
          } else {
            listOfSubTaskTimeLine.push({
              name,
              link: href,
              status,
              startTime: item.startTime,
              attempt: item.attempt,
              range: [item.startTime, listOfTimeLine[index + 1].startTime],
              subtask: item.subtask
            });
          }
        });
      };
      data.subtasks.forEach(subtask => {
        if (showAttempt) {
          subtask['attempts-time-info'].forEach((attempt: JobSubTaskTimeAttemptInterface) =>
            countTimeline(attempt, subtask.subtask)
          );
        } else {
          countTimeline(subtask, subtask.subtask);
        }
      });
      this.listOfSubTaskTimeLine = listOfSubTaskTimeLine;
      this.subTaskChartInstance.changeHeight(this.heightCalc(timeLineCount));
      this.subTaskChartInstance.source(listOfSubTaskTimeLine, this.timeConfig);
      this.subTaskChartInstance.render();
      this.isShowSubTaskTimeLine = true;
      this.cdr.markForCheck();
    });
  }

  setUpMainChart() {
    this.mainChartInstance = new G2.Chart({
      container: this.mainTimeLine.nativeElement,
      forceFit: true,
      animate: false,
      height: 500,
      padding: [50, 50, 50, 50]
    });
    this.mainChartInstance.axis('id', false);
    this.mainChartInstance
      .coord('rect')
      .transpose()
      .scale(1, -1);
    this.mainChartInstance
      .interval()
      .position('id*range')
      // @ts-ignore
      .color('status', (type: any) => COLOR_MAP[type])
      .label('name', {
        offset: -20,
        formatter: (text: string) => {
          if (text.length <= 120) {
            return text;
          } else {
            return text.slice(0, 120) + '...';
          }
        },
        textStyle: {
          fill: '#ffffff',
          textAlign: 'right',
          fontWeight: 'bold'
        }
      });
    this.mainChartInstance.tooltip({
      title: 'name'
    });
    this.mainChartInstance.on('click', (e: any) => {
      if (this.mainChartInstance.getSnapRecords(e).length) {
        this.selectedVertex = (this.mainChartInstance.getSnapRecords(e)[0] as any)._origin as VerticesItemInterface;
        this.updateSubTaskChart(this.selectedVertex.id, this.showAttempt);
      }
    });
  }

  setUpSubTaskChart() {
    this.subTaskChartInstance = new G2.Chart({
      container: this.subTaskTimeLine.nativeElement,
      forceFit: true,
      height: 10,
      animate: false,
      padding: [50, 50, 50, 320]
    });
    this.subTaskChartInstance
      .coord('rect')
      .transpose()
      .scale(1, -1);
    this.subTaskChartInstance.axis('name', {
      label: {
        htmlTemplate: (value: string, data: any) => {
          const link =
            data &&
            data.point &&
            this.subTaskChartInstance.getSnapRecords(data.point) &&
            this.subTaskChartInstance.getSnapRecords(data.point)[0] &&
            (this.subTaskChartInstance.getSnapRecords(data.point)[0] as any).link;
          return `<a href="${link}" class="attempt-href" target="_blank">${value}</a>`;
        }
      }
    });
    this.subTaskChartInstance
      .interval()
      .position('name*range')
      // @ts-ignore
      .color('status', (type: any) => COLOR_MAP[type]);
  }

  constructor(private jobService: JobService, private cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    this.setUpMainChart();
    this.setUpSubTaskChart();
    this.jobService.jobDetail$
      .pipe(
        filter(() => !!this.mainChartInstance),
        distinctUntilChanged((pre, next) => pre.jid === next.jid),
        takeUntil(this.destroy$)
      )
      .subscribe(data => {
        let listOfVertex: VerticesItemRangeInterface[] = [];
        this.jobDetail = data;
        listOfVertex = data.vertices
          .filter(v => v['start-time'] > -1)
          .map(vertex => {
            const endTime = vertex['end-time'] > -1 ? vertex['end-time'] : vertex['start-time'] + vertex.duration;
            return {
              ...vertex,
              range: [vertex['start-time'], endTime]
            };
          });
        listOfVertex.sort((a, b) => a.range[0] - b.range[0]);
        this.mainChartInstance.changeHeight(this.heightCalc(listOfVertex.length));
        this.mainChartInstance.source(listOfVertex, this.timeConfig);
        this.mainChartInstance.render();
        this.cdr.markForCheck();
      });
  }

  onSubTaskIdChange() {
    this.selectedAttemptId = null;
    let listOfSelectedSubTaskTimeline = this.listOfSubTaskTimeLine;
    if (this.selectedSubTaskId !== 'all') {
      listOfSelectedSubTaskTimeline = this.listOfSubTaskTimeLine.filter(
        item => item.subtask === this.selectedSubTaskId
      );
      this.listOfAttemptId = this.listOfVertexData
        .find(v => v.subtask === this.selectedSubTaskId)!
        ['attempts-time-info'].map(item => item['attempt-num']);
    }
    this.subTaskChartInstance.source(listOfSelectedSubTaskTimeline, this.timeConfig);
    const length = [...new Set(listOfSelectedSubTaskTimeline.map(item => `${item.attempt}-${item.subtask}`))].length;
    this.subTaskChartInstance.changeHeight(this.heightCalc(length));
    this.subTaskChartInstance.render();
  }

  onAttemptIdChange() {
    let listOfSelectedSubTaskTimeline = this.listOfSubTaskTimeLine;
    let length = this.listOfAttemptId.length;
    if (this.selectedAttemptId !== 'all') {
      listOfSelectedSubTaskTimeline = this.listOfSubTaskTimeLine.filter(
        item => item.attempt === this.selectedAttemptId
      );
      length = 1;
    }
    this.subTaskChartInstance.source(listOfSelectedSubTaskTimeline, this.timeConfig);
    this.subTaskChartInstance.changeHeight(this.heightCalc(length));
    this.subTaskChartInstance.render();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

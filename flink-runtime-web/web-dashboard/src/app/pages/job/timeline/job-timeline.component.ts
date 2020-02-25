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
  VerticesItemInterface,
  VerticesItemRangeInterface
} from 'interfaces';
import { JobService } from 'services';
import { COLOR_MAP } from 'config';

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
  selectedSubTask: VerticesItemInterface;
  isShowSubTaskTimeLine = false;
  showAttempt = false;
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
    this.updateSubTaskChart(this.selectedSubTask.id, this.showAttempt);
  }

  updateSubTaskChart(vertexId: string, showAttempt = false) {
    const listOfSubTaskTimeLine: Array<{ name: string; status: string; range: [number, number]; link: string }> = [];
    let timeLineCount = 0;
    this.jobService.loadSubTaskTimes(this.jobDetail.jid, vertexId).subscribe(data => {
      const countTimeline = (attempt: JobSubTaskTimeAttemptInterface) => {
        timeLineCount = timeLineCount + 1;
        const listOfTimeLine: Array<{ status: string; startTime: number; link: string }> = [];
        // @ts-ignore
        const link = `./#/task-manager/${attempt['taskmanager-id']}/log/taskmanager.log`;
        for (const key in attempt.timestamps) {
          // @ts-ignore
          const time = attempt.timestamps[key];
          if (time > 0) {
            listOfTimeLine.push({
              status: key,
              startTime: time,
              link
            });
          }
        }
        listOfTimeLine.sort((pre, next) => pre.startTime - next.startTime);
        listOfTimeLine.forEach((item, index) => {
          const name = `Subtask-${attempt.subtask} | Host-${attempt.host} | Attempt-${attempt['attempt-num']}`;
          const link = item.link;
          const status = item.status;
          if (index === listOfTimeLine.length - 1) {
            let endTime = attempt.duration + listOfTimeLine[0].startTime;
            if (endTime < item.startTime) {
              endTime = item.startTime;
            }
            listOfSubTaskTimeLine.push({
              name,
              link,
              status,
              range: [item.startTime, endTime]
            });
          } else {
            listOfSubTaskTimeLine.push({
              name,
              link,
              status,
              range: [item.startTime, listOfTimeLine[index + 1].startTime]
            });
          }
        });
      };
      data.subtasks.forEach(subtask => {
        if (showAttempt) {
          subtask['attempts-time-info'].forEach((attempt: JobSubTaskTimeAttemptInterface) => countTimeline(attempt));
        } else {
          countTimeline(subtask);
        }
      });
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
        this.selectedSubTask = (this.mainChartInstance.getSnapRecords(e)[0] as any)._origin as VerticesItemInterface;
        this.updateSubTaskChart(this.selectedSubTask.id, this.showAttempt);
      }
    });
  }

  setUpSubTaskChart() {
    this.subTaskChartInstance = new G2.Chart({
      container: this.subTaskTimeLine.nativeElement,
      forceFit: true,
      height: 10,
      animate: false,
      padding: [50, 50, 50, 300]
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

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}

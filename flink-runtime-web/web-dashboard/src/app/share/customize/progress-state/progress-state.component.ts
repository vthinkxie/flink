import { Component, ChangeDetectionStrategy, Input, OnChanges, SimpleChanges } from '@angular/core';

@Component({
  selector: 'flink-progress-state',
  templateUrl: './progress-state.component.html',
  styleUrls: ['./progress-state.component.less'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProgressStateComponent implements OnChanges {
  percent = 0;
  @Input() header: string;
  @Input() used = 0;
  @Input() count = 0;
  @Input() max = 0;
  @Input() config = 0;
  @Input() committed = 0;
  showCount = false;
  showConfig = false;
  showCommitted = false;
  showMax = false;

  ngOnChanges(changes: SimpleChanges): void {
    const maxData = this.max || this.config;
    this.percent = maxData > 0 && this.used > 0 ? +((this.used / maxData) * 100).toFixed(1) : 0;
    const { count, committed, config, max } = changes;
    if (max) {
      this.showMax = true;
    }
    if (count) {
      this.showCount = true;
    }
    if (config) {
      this.showConfig = true;
    }
    if (committed) {
      this.showCommitted = true;
    }
  }
}

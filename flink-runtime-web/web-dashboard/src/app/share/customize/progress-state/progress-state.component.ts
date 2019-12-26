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
  @Input() committed = 0;
  showCount = false;
  showCommitted = false;

  ngOnChanges(changes: SimpleChanges): void {
    this.percent = this.max > 0 && this.used > 0 ? +((this.used / this.max) * 100).toFixed(1) : 0;
    const { count, committed } = changes;
    if (count) {
      this.showCount = true;
    }
    if (committed) {
      this.showCommitted = true;
    }
  }
}

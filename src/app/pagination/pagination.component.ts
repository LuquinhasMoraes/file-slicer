import { Component, EventEmitter, Input, OnInit, Output  } from '@angular/core';

@Component({
  selector: 'app-pagination',
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.css']
})
export class PaginationComponent implements OnInit {
  @Input() totalItems: number = 0;
  @Input() pageSize: number = 10;
  @Output() pageChanged: EventEmitter<any> = new EventEmitter();

  currentPage: number = 1;
  totalPages: number = 0;

  ngOnInit(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.totalPages === 0) {
      this.totalPages = 1;
    }
    setTimeout(() => this.updatePage(), 0);
  }

  ngOnChanges(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);

    if (this.currentPage > this.totalPages) {
      this.currentPage = this.totalPages;
    }
    setTimeout(() => this.updatePage(), 0);
  }

  updatePage() {
    this.pageChanged.emit({
      page: this.currentPage,
      pageSize: this.pageSize
    });
  }

  onPageSizeChange(event: any) {
    this.pageSize = event.target.value;
    this.ngOnChanges();
  }

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePage();
    }
  }

  goToFirstPage() {
    this.currentPage = 1;
    this.updatePage();
  }

  goToLastPage() {
    this.currentPage = this.totalPages;
    this.updatePage();
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePage();
    }
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePage();
    }
  }
}

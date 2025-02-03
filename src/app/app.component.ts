import { Component, OnInit, Renderer2 } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { ErrorMessage, FileService } from './services/file.service';
import { ModalService } from './services/modal.service';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent implements OnInit  {
  file: File = new File([], '');
  progress: number | null = null;
  files: any[] = [];
  total: number = 0;
  realTotal: number = 0;

  form = this.formBuilder.group({
    chunckSize: ['', Validators.required],
    canSplitLine: [false],
    unit: ['bytes'],
  });

  chunkSize = 0;
  isDisabled = true;

  showModal: boolean = false;
  errorMessage: string = '';
  errorDetail: string = '';

  totalItems: number = 100;
  pageSize: number = 10;
  currentPage: number = 1;
  totalPages: number = 0;
  items: string[] = this.files;
  displayedItems: any[] = [];
  isLoading: boolean = false;
  math = Math;
  getUnit: any;
  isDarkMode = false;

  onPageChanged(event: { page: number; pageSize: number }) {
    this.currentPage = event.page;
    this.pageSize = Number(event.pageSize);
    this.updateDisplayedItems();
  }

  updateDisplayedItems() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.displayedItems = this.files.slice(
      startIndex,
      startIndex + this.pageSize
    );
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
  }

  showError(message: string, detail: string): void {
    this.errorMessage = message;
    this.errorDetail = detail;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  resetValues() {
    this.files = [];
    this.total = 0;
  }

  constructor(
    private formBuilder: FormBuilder,
    private fileService: FileService,
    public modalService: ModalService,
    private renderer: Renderer2
  ) {
    this.getUnit = this.fileService.getUnit;

    this.fileService.errorsObservable.subscribe((response: ErrorMessage) => {
      this.showError(response.titleMessage, response.detailError);
    })
  }

  ngOnInit() {
    const darkModeSetting = localStorage.getItem('darkMode');
    this.isDarkMode = darkModeSetting === 'enabled';
    const container = document.querySelector('.container');
    const section = document.querySelector('section');
    if (this.isDarkMode) {
      this.renderer.addClass(container, 'dark-mode');
      this.renderer.addClass(section, 'dark-mode');
    }
  }

  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    const container = document.querySelectorAll('.container');
    const section = document.querySelector('section');
    if (this.isDarkMode) {
      container.forEach(c => this.renderer.addClass(c, 'dark-mode'))
      this.renderer.addClass(section, 'dark-mode');
      localStorage.setItem('darkMode', 'enabled');
    } else {
      container.forEach(c => this.renderer.removeClass(c, 'dark-mode'))
      this.renderer.removeClass(section, 'dark-mode');
      localStorage.setItem('darkMode', 'disabled');
    }
  }

  async downloadAsZip() {
    let zip: JSZip = new JSZip();

    this.files.forEach((file: any) => {
      zip.file(file.name, file.arrayBuffer());
    });

    zip.generateAsync({ type: 'blob' }).then((content: any) => {
      saveAs(content, 'sliced_files.zip');
    });
  }


  setChunkSize(input: any) {
    this.chunkSize = Number(input.value);
    if (this.chunkSize > 0) {
      this.isDisabled = false;
    } else {
      this.isDisabled = true;
    }
  }

  canSplit(): boolean {
    return (
      !!this.file &&
      this.file.size > 0 &&
      !!this.file.name &&
      !!this.file.type &&
      this.form.valid
    );
  }

  validate() {
    if (this.chunkSize > this.file.size) {
      this.showError(
        'The chosen size is too large',
        'The slice size cannot be larger than the file size'
      );
      return false;
    } else if (this.chunkSize === 0) {
      this.showError(
        'The chosen size is too small',
        'The slice size cannot be zero'
      );
      return false;
    }

    return true;
  }



  async splitFile() {
    if (!this.validate()) {
      return;
    }

    if (!this.file) {
      this.modalService.show('Select at least one file', 'There isn’t any file selected');
      return;
    }

    this.resetValues();
    this.isLoading = true;
    this.files = await this.fileService.splitFile(this.file, this.chunkSize, !!this.form.value.canSplitLine, this.form.value.unit ?? "");
    this.updateDisplayedItems();
    this.isLoading = false;
  }


  onFileSelected(event: Event): void {
    console.log(this.form.value.chunckSize);

    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
      this.realTotal = this.file.size;
    }
  }

}

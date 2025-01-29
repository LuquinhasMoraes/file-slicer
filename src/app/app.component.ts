import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  file: File = new File([], '');
  progress: number | null = null;
  files: any[] = [];
  total: number = 0;
  realTotal: number = 0;

  form = this.formBuilder.group({
    chunckSize: ['', Validators.required],
    neverSplitLine: [true],
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
    console.log(this.displayedItems);

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
    // this.realTotal = 0;
  }

  constructor(private formBuilder: FormBuilder) {}

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
        'Tamanho escolhido é muito grande',
        'O tamanho da fatia não pode ser maior que o tamanho do arquivo'
      );
      return false;
    } else if (this.chunkSize === 0) {
      this.showError(
        'Tamanho escolhido é muito pequeno',
        'O tamanho da fatia não pode ser zero'
      );
      return false;
    }

    return true;
  }

  getUnit() {
    if(this.form.value.unit === 'bytes') {
      return {
        value: 1,
        code: 'bytes'
      };
    } else if(this.form.value.unit === 'KB') {
      return {
        value: 1024,
        code: 'KB'
      };
    } else {
      return {
        value: 1024 * 1024,
        code: 'MB'
      };
    }
  }

  async splitFile() {
    if (!this.validate()) {
      return;
    }

    if (!this.form.value.neverSplitLine) {
      this.resetValues();
      const chunkSize = this.chunkSize * this.getUnit().value;
      const totalChunks = Math.ceil(this.file.size / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, this.file.size);
        const chunk = this.file.slice(start, end);

        const file: any = new File([chunk], i + '_' + this.file.name, {
          type: 'text/plain',
        });

        console.log(file);

        file.link = URL.createObjectURL(file);
        file.unit = this.getUnit().code;

        const files = [file];

        this.files = [...this.files, ...files];
        this.updateDisplayedItems();
        this.total += file.size;
      }
    } else {
      this.resetValues();
      this.isLoading = true;
      this.files = await this.splitFilePreservingLines(
        this.file,
        this.chunkSize * this.getUnit().value
      );
      this.isLoading = false;
    }
  }

  async splitFilePreservingLines(file: File, chunkSize: number) {
    const utf8Decoder = new TextDecoder('utf-8');
    const utf8Encoder = new TextEncoder();
    const chunks: File[] = [];
    let currentOffset = 0;
    let currentChunk = '';
    let totalBytes = 0;

    while (currentOffset < file.size) {
      const chunkBlob = file.slice(currentOffset, currentOffset + chunkSize);
      const chunkArrayBuffer = await chunkBlob.arrayBuffer();
      const chunkText = utf8Decoder.decode(chunkArrayBuffer);

      // Divida o conteúdo em linhas
      const lines = chunkText.split('\n');

      const firstLineLength = utf8Encoder.encode(lines[0] + '\n').length;

      if(firstLineLength > chunkSize) {
        this.showError(
          'Size is too small',
          'The size chunk must be greater than file first line size'
        );
        return [];
      }

      for (const line of lines) {
        const lineLength = utf8Encoder.encode(line + '\n').length;

        // Verifica se adicionar a linha ultrapassaria o chunkSize
        if (totalBytes + lineLength > chunkSize) {
          // Se o tamanho do chunk exceder o limite, cria o chunk e reinicia
          if (currentChunk) {
            const chunkFile: any = new File([currentChunk], `${chunks.length}_${file.name}`, {
              type: 'text/plain',
            });
            chunkFile.unit = this.getUnit().code;
            chunkFile.link = URL.createObjectURL(chunkFile);
            chunks.push(chunkFile);
          } else if (lines.length === 1) {
            const chunkFile: any = new File([line], `${chunks.length}_${file.name}`, {
              type: 'text/plain',
            });
            chunkFile.unit = this.getUnit().code;
            chunkFile.link = URL.createObjectURL(chunkFile);
            chunks.push(chunkFile);
            currentOffset += file.size + 1;
          }

          // Reseta os valores
           currentChunk = '';
           totalBytes = 0;
           currentOffset -= lineLength;
        } else {
          // Adiciona a linha ao chunk atual
          currentChunk += line;
          totalBytes += lineLength;
        }
      }
      currentOffset += chunkText.length;

    }

    // Se sobrar algum conteúdo no último chunk, cria o arquivo final
    if (currentChunk) {
      const chunkFile: any = new File([currentChunk], `${chunks.length}_${file.name}`, {
        type: 'text/plain',
      });
      chunkFile.unit = this.getUnit().code;
      chunkFile.link = URL.createObjectURL(chunkFile);
      chunks.push(chunkFile);
    }

    return chunks;
  }

  onFileSelected(event: Event): void {
    console.log(this.form.value.chunckSize);

    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
      this.realTotal = this.file.size;
    }
  }


  async uploadFile(): Promise<void> {
    if (!this.file) return;

    const chunkSize = 10 * 1024 * 1024; // 10MB
    const totalChunks = Math.ceil(this.file.size / chunkSize);
    let uploadedChunks = 0;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, this.file.size);
      const chunk = this.file.slice(start, end);

      const formData = new FormData();
      formData.append('file', chunk, `${this.file.name}.part${i + 1}`);

      await fetch('https://your-server-endpoint/upload', {
        method: 'POST',
        body: formData,
      });

      uploadedChunks++;
      this.progress = Math.round((uploadedChunks / totalChunks) * 100);
    }

    alert('File uploaded successfully in chunks!');
    this.progress = null;
  }
}

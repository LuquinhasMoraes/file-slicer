import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  file: File = new File([], "");
  progress: number | null = null;
  files: any[] = [];
  total: number = 0;
  realTotal: number = 0;

  form = this.formBuilder.group({
    chunckSize: ['', Validators.required],
    neverSplitLine: [true],
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

  onPageChanged(event: { page: number, pageSize: number }) {
    this.currentPage = event.page;
    this.pageSize = event.pageSize;
    this.updateDisplayedItems();
  }

  updateDisplayedItems() {
    const startIndex = (this.currentPage - 1) * this.pageSize;
    this.displayedItems = this.files.slice(startIndex, startIndex + this.pageSize);
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
    // this.realTotal = 0;
  }

  constructor(private formBuilder: FormBuilder) {}

  setChunkSize(input: any) {
    this.chunkSize = Number(input.value);
    if (this.chunkSize > 0) {
      this.isDisabled = false;
    } else {
      this.isDisabled = true;
    }
  }

  canSplit(): boolean {
    return !!this.file && this.file.size > 0 && !!this.file.name && !!this.file.type && this.form.valid;
  }

  validate() {
    if(this.chunkSize > this.file.size) {
      this.showError('Tamanho escolhido é muito grande', 'O tamanho da fatia não pode ser maior que o tamanho do arquivo')
      return false;
    } else if(this.chunkSize === 0) {
      this.showError('Tamanho escolhido é muito pequeno', 'O tamanho da fatia não pode ser zero')
      return false;
    }

    return true;

  }

  splitFile() {

    if(!this.validate()) {
      return;
    }

    if (!this.form.value.neverSplitLine) {
      this.resetValues();
      const chunkSize = this.chunkSize;
      const totalChunks = Math.ceil(this.file.size / chunkSize);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, this.file.size);
        const chunk = this.file.slice(start, end);

        const file: any = new File(
          [chunk],
          i + '_' + this.file.name,
          {
            type: 'text/plain',
          }
        );

        console.log(file);

        file.link = URL.createObjectURL(file);
        this.files.push(file);
        this.total += file.size;
      }
    } else {
      this.resetValues();
      const reader = new FileReader();

      const chunkSize = this.chunkSize; //* 1024;
      const utf8Encode = new TextEncoder();
      let contentBuffer = ''; // Acumulador para os dados
      const files: any = []; // Para armazenar os pedaços processados

      // Adiciona um novo chunk e atualiza tamanho total da somas dos arquivos
      const addFileChunk = (content: string, index: number): void => {
        const chunk: any = new Blob([content], { type: 'text/plain' });
        chunk.link = URL.createObjectURL(chunk);
        chunk.name = index + '_' + this.file?.name;
        files.push(chunk);
        this.total += chunk.size;
      };

      // Evento para esperar o carregamento da leitura do arquivo
      reader.onload = (evt: ProgressEvent<FileReader>) => {
        const fileContent = (evt.target?.result as string).split('\n');
        fileContent.forEach((line, index) => {
          const isLastLine = index === fileContent.length - 1;

          /*
           Importante!
           Verifica se o tamanho em bytes da linha do arquivo é maior do que o tamanho escolhido para o chunk
           Isto é necessário, pois se o tamanho do chunk escolhido for menor que o tamanho da linha do arquivo, a linha será quebrada e isto não deve acontecer neste tipo de processamento
          */
          if(utf8Encode.encode(line + '\n').byteLength > chunkSize) {
            this.showError('Tamanho escolhido é muito pequeno', 'O tamanho não pode ser menor que o tamanho em bytes de cada linha')
            return;
          }
          /**
           * Verifica se o tamanho do conteúdo do chunk atual que está sendo montando + o tamanho do conteúdo da próx linha que vai ser iterada é menor ou igual o valor do escolhido para o chunk
           * Isto é importante pois só podemos continuar iterando e incrementando o conteúdo com a próxima linha, se tivermos certeza que não passará do limite escolhido pelo usuário
           */
          else if (
            utf8Encode.encode(contentBuffer + line + '\n').byteLength <=
            chunkSize
          ) {
            contentBuffer += line + '\n';
          }
          /**
           * Caso contrário
           * Precisamos criar um novo file chunk para armazenar o conteúdo do arquivo, e recomeçamos a armazenar as próximas linhas do contentBuffer
           */
          else {
            // Armazena o chunk atual e inicia um novo buffer
            addFileChunk(contentBuffer, index);
            contentBuffer = line + '\n';
          }

          // Se for a última linha, armazena o buffer restante
          if (isLastLine) {
            addFileChunk(contentBuffer, index);
          }
        });

        this.files = files;
      };

      reader.readAsText(this.file, 'UTF-8');
    }
  }

  onFileSelected(event: Event): void {
    console.log(this.form.value.chunckSize);

    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      this.file = input.files[0];
      this.realTotal = this.file.size;
    }
  }

  private isLastIteration(i: number, contentFile: any): boolean {
    return i === contentFile.length - 1;
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

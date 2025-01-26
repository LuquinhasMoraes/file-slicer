import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  file: File | null = null;
  progress: number | null = null;
  files: any[] = [];
  total: number = 0;
  realTotal: number = 0;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const reader = new FileReader();
      this.file = input.files[0];
      this.realTotal = this.file.size;
      const chunkSize = 1 * 1024; // 1 KB
      const utf8Encode = new TextEncoder();
      let contentBuffer = ''; // Acumulador para os dados
      const files: any = []; // Para armazenar os pedaços processados

      // Função para criar e adicionar um novo chunk de arquivo
      const addFileChunk = (content: string): void => {
        const chunk: any = new Blob([content], { type: 'text/plain' });
        chunk.link = URL.createObjectURL(chunk);
        chunk.name = this.file?.name;
        files.push(chunk);
        this.total += chunk.size;
      };

      // Evento de carregamento do arquivo
      reader.onload = (evt: ProgressEvent<FileReader>) => {
        const fileContent = (evt.target?.result as string).split('\n');
        fileContent.forEach((line, index) => {
          const isLastLine = index === fileContent.length - 1;

          // Adiciona a linha ao buffer, verificando o tamanho acumulado
          if (
            utf8Encode.encode(contentBuffer + line + '\n').byteLength <=
            chunkSize
          ) {
            contentBuffer += line + '\n';
          } else {
            // Armazena o chunk atual e inicia um novo buffer
            addFileChunk(contentBuffer);
            contentBuffer = line + '\n';
          }

          // Se for a última linha, armazena o buffer restante
          if (isLastLine) {
            addFileChunk(contentBuffer);
          }
        });

        // Atualiza a lista de arquivos processados
        this.files = files;
      };

      // Lê o arquivo como texto UTF-8
      reader.readAsText(this.file, 'UTF-8');
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

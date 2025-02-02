import { Injectable } from '@angular/core';
import * as JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Subject } from 'rxjs';

export interface ErrorMessage {
  titleMessage: string,
  detailError: string
}

@Injectable({
  providedIn: 'root'
})
export class FileService {

  public files: any = [];
  public errors: Subject<ErrorMessage> = new Subject<ErrorMessage>();
  public errorsObservable = this.errors.asObservable();

  async downloadAsZip(files: File[]) {
    let zip = new JSZip();
    files.forEach(file => zip.file(file.name, file.arrayBuffer()));
    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, 'sliced_files.zip');
  }

  async uploadFile(file: File, endpoint: string, onProgress: (progress: number) => void) {
    const chunkSize = 10 * 1024 * 1024; // 10MB
    const totalChunks = Math.ceil(file.size / chunkSize);
    let uploadedChunks = 0;

    for (let i = 0; i < totalChunks; i++) {
      const chunk = file.slice(i * chunkSize, Math.min((i + 1) * chunkSize, file.size));
      const formData = new FormData();
      formData.append('file', chunk, `${file.name}.part${i + 1}`);

      await fetch(endpoint, { method: 'POST', body: formData });
      uploadedChunks++;
      onProgress(Math.round((uploadedChunks / totalChunks) * 100));
    }
  }

  getUnit(unit: string) {
    const units: any = {
      'bytes': {
        value: 1,
        code: 'bytes'
      },
      'KB': {
        value: 1024,
        code: 'KB'
      },
      'MB': {
        value: 1024 * 1024,
        code: 'MB'
      }
    }

    return units[unit];
  }

  async splitFile(file: File, chunkSize: number, canSplitLine: boolean, unit: string): Promise<File[]> {

    let files: any = [];
    if (!canSplitLine) {
      const chunkSizeByUnit = chunkSize * this.getUnit(unit).value;
      const totalChunks = Math.ceil(file.size / chunkSizeByUnit);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSizeByUnit;
        const end = Math.min(start + chunkSizeByUnit, file.size);
        const chunk = file.slice(start, end);

        const fileSliced: any = new File([chunk], i + '_' + file.name, {
          type: 'text/plain',
        });

        fileSliced.link = URL.createObjectURL(fileSliced);
        fileSliced.unit = this.getUnit(unit).code;

        files.push(fileSliced);
      }
    } else {
      files = await this.splitFilePreservingLines(
        file,
        chunkSize,
        unit
      );
    }

    return files;
  }


  async splitFilePreservingLines(file: File, chunkSize: number, unit: string) {
    chunkSize = chunkSize * this.getUnit(unit).value;
    const utf8Decoder = new TextDecoder('utf-8');
    const utf8Encoder = new TextEncoder();
    const un = this.getUnit(unit).code;
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
      if(chunkSize < firstLineLength) {
        this.errors.next({
          titleMessage: 'Size is too small',
          detailError: "The chunk size must be greater than the size of the file's first line"
        })
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
            chunkFile.unit = un;
            chunkFile.link = URL.createObjectURL(chunkFile);
            chunks.push(chunkFile);
          } else if (lines.length === 1) {
            const chunkFile: any = new File([line], `${chunks.length}_${file.name}`, {
              type: 'text/plain',
            });
            chunkFile.unit = un;
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
      chunkFile.unit = this.getUnit(unit).code;
      chunkFile.link = URL.createObjectURL(chunkFile);
      chunks.push(chunkFile);
    }

    return chunks;
  }
}

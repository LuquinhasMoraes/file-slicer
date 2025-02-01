import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ModalService {
  message: string = '';
  detail: string = '';
  isVisible: boolean = false;

  show(message: string, detail: string) {
    this.message = message;
    this.detail = detail;
    this.isVisible = true;
  }

  close() {
    this.isVisible = false;
  }
}

declare module 'qrcode-svg' {
  interface QRCodeOptions {
    content: string;
    padding?: number;
    width?: number;
    height?: number;
    color?: string;
    background?: string;
    ecl?: string;
  }
  
  class QRCode {
    constructor(options: QRCodeOptions);
    svg(): string;
  }
  
  export = QRCode;
} 
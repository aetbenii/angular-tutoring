import { CommonModule } from "@angular/common";
import { Component, Inject } from "@angular/core";
import { MatButtonModule } from "@angular/material/button";
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from "@angular/material/dialog";

@Component({
    selector: 'app-delete-seat-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule],
    templateUrl: './delete-seat-dialog.component.html',
    styles: ['']

})
export class DeleteSeatDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<DeleteSeatDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: {seatId: number, seatNumber: string}
    ) {}
}
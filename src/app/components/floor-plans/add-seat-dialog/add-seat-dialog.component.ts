import { CommonModule } from "@angular/common";
import { Component } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatDialogModule, MatDialogRef } from "@angular/material/dialog";
import { MatFormField, MatLabel } from "@angular/material/form-field";
import { MatInputModule } from "@angular/material/input";

@Component({
    selector: 'app-add-seat-dialog',
    standalone: true,
    imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormField, FormsModule, MatInputModule, MatLabel],
    templateUrl: './add-seat-dialog.component.html',
    styles: 
    [`  
           
    `]

})
export class AddSeatDialogComponent{
    seatNumber = '';

    constructor(
        public dialogRef: MatDialogRef<AddSeatDialogComponent>) {}
}
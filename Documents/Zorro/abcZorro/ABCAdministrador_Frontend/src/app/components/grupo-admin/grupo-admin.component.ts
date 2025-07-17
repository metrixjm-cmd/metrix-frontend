
import { Component, OnInit } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-grupo-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './grupo-admin.component.html',
  styleUrls: ['./grupo-admin.component.scss']
})
export class GrupoAdminComponent implements OnInit {
  colaboradores: any[] = [];
  colaborador = {
    nombreCompleto: '',
    puesto: '',
    rol: '',
    fotoUrl: ''
  };
  defaultImage = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.cargarColaboradores();
  }
  
  rolClass(rol: string): string {
    switch (rol) {
      case 'gerente':
        return 'bg-danger text-white'; // rojo
      case 'lider':
        return 'bg-info text-white'; // azul
      case 'desarrollo':
        return 'bg-success text-white'; // verde
      default:
        return 'bg-secondary text-white'; // por si acaso
    }
  }

  cargarColaboradores() {
    this.http.get<any[]>('http://localhost:8080/api/miembros').subscribe(data => {
      this.colaboradores = data;
    });
  }

  agregarColaborador() {
    this.http.post('http://localhost:8080/api/miembros', this.colaborador).subscribe(() => {
      this.colaborador = { nombreCompleto: '', puesto: '', rol: '', fotoUrl: '' };
      this.cargarColaboradores();
    });
  }

  eliminar(id: string) {
    if (confirm('¿Deseas eliminar este colaborador?')) {
      this.http.delete(`http://localhost:8080/api/miembros/${id}`).subscribe(() => {
        this.cargarColaboradores();
      });
    }
  }
}

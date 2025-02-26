<?php

namespace App\Http\Requests\Game;

use Illuminate\Foundation\Http\FormRequest;

class ShotRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        // Verificación más compleja de autorización se hará en el controlador
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array|string>
     */
    public function rules(): array
    {
        return [
            'position_x' => 'required|integer|min:0|max:9',
            'position_y' => 'required|integer|min:0|max:9',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array
     */
    public function messages(): array
    {
        return [
            'position_x.required' => 'La coordenada X es obligatoria.',
            'position_x.integer' => 'La coordenada X debe ser un número entero.',
            'position_x.min' => 'La coordenada X debe estar entre 0 y 9.',
            'position_x.max' => 'La coordenada X debe estar entre 0 y 9.',
            'position_y.required' => 'La coordenada Y es obligatoria.',
            'position_y.integer' => 'La coordenada Y debe ser un número entero.',
            'position_y.min' => 'La coordenada Y debe estar entre 0 y 9.',
            'position_y.max' => 'La coordenada Y debe estar entre 0 y 9.',
        ];
    }
}
<?php

namespace App\Http\Requests\Auth;

use Illuminate\Foundation\Http\FormRequest;

class RegisterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
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
            'username' => 'required|string|min:5|unique:users,username',
            'password' => [
                'required',
                'string',
                'min:8',
                'confirmed',
                'regex:/[a-z]/',    // Al menos una minúscula
                'regex:/[A-Z]/',    // Al menos una mayúscula
                'regex:/[0-9]/',    // Al menos un número
            ],
            'registration_source' => 'required|in:friend,social_media,advertisement',
            'has_played' => 'required|boolean',
            'accept_terms' => 'required|accepted',
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
            'username.required' => 'El nombre de usuario es obligatorio.',
            'username.min' => 'El nombre de usuario debe tener al menos 5 caracteres.',
            'username.unique' => 'Este nombre de usuario ya está en uso.',
            'password.required' => 'La contraseña es obligatoria.',
            'password.min' => 'La contraseña debe tener al menos 8 caracteres.',
            'password.regex' => 'La contraseña debe contener al menos una minúscula, una mayúscula y un número.',
            'password.confirmed' => 'Las contraseñas no coinciden.',
            'registration_source.required' => 'Es necesario indicar cómo has conocido esta web.',
            'registration_source.in' => 'La fuente de registro seleccionada no es válida.',
            'has_played.required' => 'Es necesario indicar si has jugado alguna vez.',
            'accept_terms.required' => 'Debes aceptar los términos y condiciones.',
            'accept_terms.accepted' => 'Debes aceptar los términos y condiciones.',
        ];
    }
}
import { Controller } from 'react-hook-form';

import { Input } from '@fnb/ui-web';

import { useFieldErrorMessage } from '../lib/form-errors';

import type { InputProps } from '@fnb/ui-web';
import type { Control, FieldPath, FieldValues } from 'react-hook-form';

export interface FormTextFieldProps<
  T extends FieldValues,
  TOutput extends FieldValues = T,
> extends Omit<InputProps, 'value' | 'onChange' | 'error' | 'name'> {
  /** From `useForm<Input, unknown, Output>()`. */
  control: Control<T, unknown, TOutput>;
  name: FieldPath<T>;
  /** Translated messages for the `error` values the form schema sets, keyed by that value. */
  customErrors?: Readonly<Record<string, string>>;
}

/** An `Input` bound to a react-hook-form field, with the error translated. */
export function FormTextField<T extends FieldValues, TOutput extends FieldValues = T>({
  control,
  name,
  customErrors,
  ...inputProps
}: FormTextFieldProps<T, TOutput>) {
  const fieldErrorMessage = useFieldErrorMessage();
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Input
          {...inputProps}
          name={field.name}
          value={typeof field.value === 'string' ? field.value : ''}
          onChange={field.onChange}
          onBlur={field.onBlur}
          error={fieldErrorMessage(fieldState.error, customErrors)}
        />
      )}
    />
  );
}
